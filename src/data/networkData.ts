import { NetworkData, NetworkNode, NetworkLink, Employee } from '../types';
import { employeeAPI } from '../services/api';

// Generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

// Generate color based on name
const getBackgroundColor = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#FFB6C1', '#87CEEB'
  ];
  const index = Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
  return colors[index];
};

// Generate avatar data URL for employees without photos
const generateAvatarDataURL = (name: string): string => {
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);
  
  // Create SVG avatar
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="${backgroundColor}"/>
      <text x="20" y="26" font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
            fill="white" text-anchor="middle">${initials}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Function to create network nodes from employees
export const createNetworkNodes = (employees: Employee[]): NetworkNode[] => {
  return employees.map(employee => {
    // Use employee photo if available, otherwise generate initials avatar
    const photoUrl = employee.photoUrl || employee.photo;
    const avatar = photoUrl ? photoUrl : generateAvatarDataURL(employee.name);
    
    return {
      id: employee.id,
      name: employee.name,
      department: employee.department,
      riskScore: employee.riskScore,
      riskLevel: employee.riskLevel,
      photo: avatar
    };
  });
};

// Function to generate network links based on employee relationships
export const generateNetworkLinks = (employees: Employee[]): NetworkLink[] => {
  const links: NetworkLink[] = [];
  
  if (employees.length < 2) return links;
  
  // Create connections based on various risk factors
  for (let i = 0; i < employees.length; i++) {
    for (let j = i + 1; j < employees.length; j++) {
      const emp1 = employees[i];
      const emp2 = employees[j];
      
      // Create connections based on risk levels and departments
      let connectionStrength = 0;
      let connectionType: 'email' | 'file_share' | 'suspicious' | 'collaboration' = 'collaboration';
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      
      // Same department increases connection probability
      if (emp1.department === emp2.department) {
        connectionStrength += 0.3;
      }
      
      // High-risk employees tend to have suspicious connections
      if ((emp1.riskLevel === 'High' || emp1.riskLevel === 'Critical') && 
          (emp2.riskLevel === 'High' || emp2.riskLevel === 'Critical')) {
        connectionStrength += 0.6;
        connectionType = 'suspicious';
        riskLevel = 'High';
      } else if ((emp1.riskLevel === 'Medium' && emp2.riskLevel === 'Medium') ||
                 ((emp1.riskLevel === 'High' || emp1.riskLevel === 'Critical') && emp2.riskLevel === 'Medium') ||
                 (emp1.riskLevel === 'Medium' && (emp2.riskLevel === 'High' || emp2.riskLevel === 'Critical'))) {
        connectionStrength += 0.4;
        connectionType = 'file_share';
        riskLevel = 'Medium';
      } else {
        connectionStrength += 0.2;
        connectionType = 'email';
        riskLevel = 'Low';
      }
      
      // Only create connections above a threshold to avoid too many links
      if (connectionStrength > 0.3) {
        links.push({
          source: emp1.id,
          target: emp2.id,
          strength: Math.min(connectionStrength, 1.0),
          type: connectionType,
          frequency: Math.floor(connectionStrength * 50) + Math.floor(Math.random() * 20),
          riskLevel
        });
      }
    }
  }
  
  return links;
};

// Static network nodes - will be populated dynamically
export let networkNodes: NetworkNode[] = [];

// Function to create network data from real employees
export const createNetworkData = async (): Promise<NetworkData> => {
  try {
    console.log('🔗 Creating network data from real employees...');
    const response = await employeeAPI.getAll({ limit: 50 }); // Get all employees
    const employees = response.employees || response; // Handle different response structures
    console.log(`📊 Loaded ${employees.length} employees for network visualization`);
    
    const nodes = createNetworkNodes(employees);
    const links = generateNetworkLinks(employees);
    
    console.log(`🔗 Generated ${nodes.length} nodes and ${links.length} links`);
    
    // Update the global networkNodes for backwards compatibility
    networkNodes.splice(0, networkNodes.length, ...nodes);
    
    return {
      nodes,
      links
    };
  } catch (error) {
    console.error('❌ Failed to create network data:', error);
    // Return empty data on error
    return {
      nodes: [],
      links: []
    };
  }
};

// Backwards compatibility export - will be empty until createNetworkData is called
export const networkData: NetworkData = {
  nodes: networkNodes,
  links: []
};