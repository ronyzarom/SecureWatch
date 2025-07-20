import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { X, Filter, Search, Users, AlertTriangle, Info, Mail, Shield, Clock, ExternalLink, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { NetworkData, NetworkNode, NetworkLink } from '../types';
import { getRiskColor } from '../utils/riskUtils';
import { employeeAPI, emailAPI } from '../services/api';

interface NetworkMapModalProps {
  networkData: NetworkData;
  onClose: () => void;
}

export const NetworkMapModal: React.FC<NetworkMapModalProps> = ({ networkData, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [filteredNodes, setFilteredNodes] = useState<NetworkNode[]>(networkData.nodes);
  const [filteredLinks, setFilteredLinks] = useState<NetworkLink[]>(networkData.links);

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to safely format risk scores
  const formatRiskScore = (riskScore: number | null | undefined): string => {
    if (riskScore === null || riskScore === undefined || isNaN(riskScore)) {
      return '0';
    }
    return riskScore.toString();
  };
  
  // Investigation panel state
  const [investigationData, setInvestigationData] = useState<{
    employee: any;
    violations: any[];
    emails: any[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(new Set());

  // Initialize filtered data when networkData changes
  useEffect(() => {
    setFilteredNodes(networkData.nodes);
    setFilteredLinks(networkData.links);
  }, [networkData]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Filter data based on search and risk filter
    let newFilteredNodes = networkData.nodes;
    let newFilteredLinks = networkData.links;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // Find nodes that match the search term
      const matchingNodes = networkData.nodes.filter(node => 
        node.name.toLowerCase().includes(searchLower) ||
        node.department.toLowerCase().includes(searchLower)
      );
      
      if (matchingNodes.length > 0) {
        // Get IDs of matching nodes
        const matchingNodeIds = new Set(matchingNodes.map(n => n.id));
        
        // Find all connections involving these nodes
        const relevantLinks = networkData.links.filter(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          return matchingNodeIds.has(sourceId) || matchingNodeIds.has(targetId);
        });
        
        // Get all connected node IDs
        const connectedNodeIds = new Set<string | number>();
        matchingNodes.forEach(node => connectedNodeIds.add(node.id));
        
        relevantLinks.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          connectedNodeIds.add(sourceId);
          connectedNodeIds.add(targetId);
        });
        
        // Include the searched node(s) and all their connected nodes
        newFilteredNodes = networkData.nodes.filter(node => connectedNodeIds.has(node.id));
        newFilteredLinks = relevantLinks;
      } else {
        // No matches found, show empty graph
        newFilteredNodes = [];
        newFilteredLinks = [];
      }
    }

    if (filterRisk !== 'all') {
      newFilteredNodes = newFilteredNodes.filter(node => node.riskLevel === filterRisk);
      const nodeIds = new Set(newFilteredNodes.map(n => n.id));
      newFilteredLinks = newFilteredLinks.filter(link => 
        nodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) &&
        nodeIds.has(typeof link.target === 'string' ? link.target : link.target.id)
      );
    }

    // Update state with filtered data
    setFilteredNodes(newFilteredNodes);
    setFilteredLinks(newFilteredLinks);

    // Create simulation
    const simulation = d3.forceSimulation(newFilteredNodes as any)
      .force('link', d3.forceLink(newFilteredLinks).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create container
    const container = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create links
    const links = container.selectAll('.link')
      .data(newFilteredLinks)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d: NetworkLink) => {
        switch (d.riskLevel) {
          case 'High': return '#ef4444';
          case 'Medium': return '#f59e0b';
          case 'Low': return '#10b981';
          default: return '#6b7280';
        }
      })
      .attr('stroke-width', (d: NetworkLink) => Math.max(1, d.strength * 4))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d: NetworkLink) => d.type === 'suspicious' ? '5,5' : 'none');

    // Create node groups
    const nodeGroups = container.selectAll('.node')
      .data(newFilteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<any, NetworkNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add node circles (background for photos)
    nodeGroups.append('circle')
      .attr('r', 25)
      .attr('fill', (d: NetworkNode) => {
        switch (d.riskLevel) {
          case 'Critical': return '#fef2f2';
          case 'High': return '#fff7ed';
          case 'Medium': return '#fffbeb';
          case 'Low': return '#f0fdf4';
          default: return '#f9fafb';
        }
      })
      .attr('stroke', (d: NetworkNode) => {
        switch (d.riskLevel) {
          case 'Critical': return '#ef4444';
          case 'High': return '#f59e0b';
          case 'Medium': return '#eab308';
          case 'Low': return '#10b981';
          default: return '#6b7280';
        }
      })
      .attr('stroke-width', 3);

    // Add profile photos
    nodeGroups.append('image')
      .attr('href', (d: NetworkNode) => d.photo)
      .attr('x', -20)
      .attr('y', -20)
      .attr('width', 40)
      .attr('height', 40)
      .attr('clip-path', 'circle(20px)')
      .style('pointer-events', 'none');

    // Add risk score badges
    nodeGroups.append('circle')
      .attr('cx', 18)
      .attr('cy', -18)
      .attr('r', 12)
      .attr('fill', (d: NetworkNode) => {
        switch (d.riskLevel) {
          case 'Critical': return '#ef4444';
          case 'High': return '#f59e0b';
          case 'Medium': return '#eab308';
          case 'Low': return '#10b981';
          default: return '#6b7280';
        }
      });

    nodeGroups.append('text')
      .attr('x', 18)
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text((d: NetworkNode) => d.riskScore);

    // Add labels
    nodeGroups.append('text')
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .text((d: NetworkNode) => d.name.split(' ')[0]);

    nodeGroups.append('text')
      .attr('y', 52)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text((d: NetworkNode) => d.department);

    // Add click handlers
    nodeGroups.on('click', (event, d) => {
      setSelectedNode(d);
      loadInvestigationData(d);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroups.attr('transform', (d: NetworkNode) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [networkData, filterRisk, searchTerm]);

  // Load investigation data for selected employee
  const loadInvestigationData = async (node: NetworkNode) => {
    setInvestigationData({
      employee: null,
      violations: [],
      emails: [],
      loading: true,
      error: null
    });

    try {
      // Fetch employee details (includes violations) and emails in parallel
      const [employeeResponse, emailsResponse] = await Promise.all([
        employeeAPI.getById(node.id),
        emailAPI.getAll({ employee_id: node.id, limit: 50 })
      ]);

      setInvestigationData({
        employee: employeeResponse.employee || employeeResponse,
        violations: employeeResponse.violations || [],
        emails: emailsResponse.emails || emailsResponse || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load investigation data:', error);
      setInvestigationData({
        employee: null,
        violations: [],
        emails: [],
        loading: false,
        error: 'Failed to load investigation data'
      });
    }
  };

  // Toggle email content expansion
  const toggleEmailExpansion = (emailId: number) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const getRiskStats = () => {
    const stats = networkData.nodes.reduce((acc, node) => {
      acc[node.riskLevel] = (acc[node.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  };

  const riskStats = getRiskStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Network Analysis Map</h2>
                <p className="text-gray-600 dark:text-gray-300">Employee communication patterns and risk connections</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto bg-white dark:bg-gray-800">
            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Employees</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or department..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Risk Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Risk Level</label>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Risk Levels</option>
                <option value="Critical">Critical Risk</option>
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
            </div>

            {/* Risk Statistics */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Risk Distribution</h3>
              <div className="space-y-2">
                {Object.entries(riskStats).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(level)}`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{level}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <Info className="w-4 h-4" />
                <span>{showLegend ? 'Hide' : 'Show'} Legend</span>
              </button>
            </div>

            {/* Legend */}
            {showLegend && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-red-500" style={{ strokeDasharray: '2,2' }}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Suspicious Activity</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-orange-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">File Sharing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-blue-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Email Communication</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-0.5 bg-green-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Meeting Collaboration</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Node Info */}
            {selectedNode && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Employee</h4>
                <div className="flex items-center space-x-3">
                  <img src={selectedNode.photo} alt={selectedNode.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedNode.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedNode.department}</p>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Risk Score: {selectedNode.riskScore}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Network Visualization */}
          <div className="flex-1 p-6">
            <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 800 600"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Investigation Panel */}
          {investigationData && (
            <div className="w-96 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Investigation</h3>
                <button
                  onClick={() => setInvestigationData(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {investigationData.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading evidence...</span>
                </div>
              ) : investigationData.error ? (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {investigationData.error}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Employee Info */}
                  {investigationData.employee && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {investigationData.employee.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {investigationData.employee.jobTitle} • {investigationData.employee.department}
                          </p>
                        </div>
                      </div>
                                              <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${getRiskColor(investigationData.employee.riskLevel)}`}></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {investigationData.employee.riskScore}% Risk
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {investigationData.employee.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Violations */}
                  {investigationData.violations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                        Violations ({investigationData.violations.length})
                      </h5>
                      <div className="space-y-2">
                        {(investigationData.violations || []).map((violation: any) => {
                          const evidenceEmails = (investigationData.emails || []).filter((email: any) => 
                            violation.emailEvidenceIds && violation.emailEvidenceIds.includes(email.id)
                          );
                          
                          return (
                            <div key={violation.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h6 className="font-medium text-red-900 dark:text-red-100 text-sm">
                                    {violation.type}
                                  </h6>
                                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                    {violation.description}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      violation.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                      violation.severity === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    }`}>
                                      {violation.severity}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      violation.status === 'Active' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    }`}>
                                      {violation.status}
                                    </span>
                                    {evidenceEmails.length > 0 && (
                                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center">
                                        <Mail className="w-3 h-3 mr-1" />
                                        {evidenceEmails.length} Evidence
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Show evidence emails */}
                                  {evidenceEmails.length > 0 && (
                                    <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Email Evidence:</span>
                                        <div className="mt-1 space-y-1">
                                          {evidenceEmails.map((email: any) => (
                                            <div key={email.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white text-xs">
                                                  {email.subject || 'No Subject'}
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400 text-xs">
                                                  {formatDate(email.sentAt)} • Risk: {formatRiskScore(email.riskScore)}%
                                                </div>
                                              </div>
                                              <button
                                                onClick={() => toggleEmailExpansion(email.id)}
                                                className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded text-xs"
                                              >
                                                View
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Email Evidence */}
                  {(investigationData.emails || []).length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-blue-500" />
                        Email Evidence ({(investigationData.emails || []).length})
                      </h5>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(investigationData.emails || [])
                          .sort((a: any, b: any) => {
                            const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
                            const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
                            return dateB - dateA;
                          })
                          .map((email: any) => (
                          <div key={email.id} className={`border rounded-lg p-3 ${
                            (email.riskScore || 0) >= 70 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                            (email.riskScore || 0) >= 40 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                            'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h6 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {email.subject || 'No Subject'}
                                  </h6>
                                  {(email.riskScore || 0) > 0 && (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      (email.riskScore || 0) >= 70 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                      (email.riskScore || 0) >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                      {formatRiskScore(email.riskScore)}% Risk
                                    </span>
                                  )}
                                  {email.violation && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Triggered Violation
                                    </span>
                                  )}
                                </div>
                                
                                                                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(email.sentAt)}</span>
                                  </div>
                                  {email.category === 'external' && (
                                    <div className="flex items-center space-x-1">
                                      <ExternalLink className="w-3 h-3" />
                                      <span>External</span>
                                    </div>
                                  )}
                                                                     {email.attachments && (() => {
                                     try {
                                       // Check if attachments is already an object or needs parsing
                                       let attachments = email.attachments;
                                       if (typeof attachments === 'string') {
                                         attachments = JSON.parse(attachments);
                                       }
                                       
                                       return Array.isArray(attachments) && attachments.length > 0 && (
                                         <div className="flex items-center space-x-1">
                                           <FileText className="w-3 h-3" />
                                           <span>{attachments.length} files</span>
                                         </div>
                                       );
                                     } catch {
                                       return null;
                                     }
                                   })()}
                                </div>

                                <button
                                  onClick={() => toggleEmailExpansion(email.id)}
                                  className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                  {expandedEmails.has(email.id) ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  <span>{expandedEmails.has(email.id) ? 'Hide' : 'Show'} Details</span>
                                </button>

                                                                {expandedEmails.has(email.id) && (
                                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                                    <div className="text-xs space-y-2">
                                      {email.violation && (
                                        <div>
                                          <span className="font-medium text-red-700 dark:text-red-300">Triggered Violation:</span>
                                          <div className="ml-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                            <div className="font-medium text-red-900 dark:text-red-100">
                                              {email.violation.type}
                                            </div>
                                            <div className="text-red-700 dark:text-red-300 text-xs">
                                              Severity: {email.violation.severity}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <span className="font-medium">Recipients:</span>
                                        <div className="ml-2">
                                          {(() => {
                                            try {
                                              // Check if recipients is already an object or needs parsing
                                              let recipients = email.recipients;
                                              if (typeof recipients === 'string') {
                                                recipients = JSON.parse(recipients);
                                              }
                                              
                                              if (Array.isArray(recipients)) {
                                                return recipients.map((recipient: any, idx: number) => (
                                                  <div key={idx} className="text-gray-600 dark:text-gray-400">
                                                    {recipient.email} ({recipient.type})
                                                  </div>
                                                ));
                                              } else {
                                                return <div className="text-gray-600 dark:text-gray-400">No recipients found</div>;
                                              }
                                            } catch (error) {
                                              console.error('Recipients parsing error:', error, 'Data:', email.recipients);
                                              return <div className="text-gray-600 dark:text-gray-400">Invalid recipient data</div>;
                                            }
                                          })()}
                                        </div>
                                      </div>
                                      
                                      {email.bodyText && (
                                        <div>
                                          <span className="font-medium">Content:</span>
                                          <p className="ml-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-xs leading-relaxed">
                                            {email.bodyText.substring(0, 500)}
                                            {email.bodyText.length > 500 && '...'}
                                          </p>
                                        </div>
                                      )}

                                                                             {email.riskFlags && (() => {
                                         try {
                                           // Check if riskFlags is already an object or needs parsing
                                           let riskFlags = email.riskFlags;
                                           if (typeof riskFlags === 'string') {
                                             riskFlags = JSON.parse(riskFlags);
                                           }
                                           
                                           return riskFlags && typeof riskFlags === 'object' && Object.keys(riskFlags).length > 0 && (
                                             <div>
                                               <span className="font-medium">Risk Flags:</span>
                                               <div className="ml-2 flex flex-wrap gap-1 mt-1">
                                                 {Object.entries(riskFlags).map(([flag, value]: [string, any]) => (
                                                   value && (
                                                     <span key={flag} className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                                                       {flag.replace(/_/g, ' ')}
                                                     </span>
                                                   )
                                                 ))}
                                               </div>
                                             </div>
                                           );
                                         } catch {
                                           return null;
                                         }
                                       })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {investigationData.violations.length === 0 && investigationData.emails.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No violations or flagged emails found for this employee.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center space-x-4">
              <span>
                {searchTerm ? 
                  `Showing ${filteredNodes.length} employees connected to "${searchTerm}"` : 
                  `Showing ${filteredNodes.length} employees`
                }
              </span>
              <span>•</span>
              <span>{filteredLinks.length} connections</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              <span>Drag nodes to explore • Zoom with mouse wheel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};