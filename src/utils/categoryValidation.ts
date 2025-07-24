// Frontend Category Validation Utility
// Enhanced validation for threat categories with real-time feedback

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

export class CategoryValidationClient {
  static VALID_CATEGORY_TYPES = ['predefined', 'custom', 'industry_specific'];
  static VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
  static VALID_INDUSTRIES = [
    'Technology', 'Healthcare', 'Finance', 'Manufacturing', 
    'Retail', 'Government', 'Education', 'Energy', 'Transportation',
    'Legal', 'Real Estate', 'Media', 'Hospitality', 'All'
  ];

  static MAX_NAME_LENGTH = 255;
  static MAX_DESCRIPTION_LENGTH = 2000;
  static MAX_KEYWORDS_COUNT = 50;
  static MAX_KEYWORD_LENGTH = 255;
  static MIN_RISK_SCORE = 0;
  static MAX_RISK_SCORE = 100;

  /**
   * Validate category form data
   */
  static validateCategory(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any = {};

    // Name validation
    const nameResult = this.validateName(data.name);
    if (nameResult.error) {
      errors.push({ field: 'name', message: nameResult.error, code: 'INVALID_NAME' });
    } else {
      sanitized.name = nameResult.value;
    }

    // Description validation
    const descResult = this.validateDescription(data.description);
    if (descResult.error) {
      errors.push({ field: 'description', message: descResult.error, code: 'INVALID_DESCRIPTION' });
    } else {
      sanitized.description = descResult.value;
    }

    // Category type validation
    const typeResult = this.validateCategoryType(data.categoryType);
    if (typeResult.error) {
      errors.push({ field: 'categoryType', message: typeResult.error, code: 'INVALID_TYPE' });
    } else {
      sanitized.categoryType = typeResult.value;
    }

    // Industry validation
    const industryResult = this.validateIndustry(data.industry);
    if (industryResult.error) {
      errors.push({ field: 'industry', message: industryResult.error, code: 'INVALID_INDUSTRY' });
    } else {
      sanitized.industry = industryResult.value;
    }

    // Risk score validation
    const riskResult = this.validateRiskScore(data.baseRiskScore);
    if (riskResult.error) {
      errors.push({ field: 'baseRiskScore', message: riskResult.error, code: 'INVALID_RISK_SCORE' });
    } else {
      sanitized.baseRiskScore = riskResult.value;
    }

    // Severity validation
    const severityResult = this.validateSeverity(data.severity);
    if (severityResult.error) {
      errors.push({ field: 'severity', message: severityResult.error, code: 'INVALID_SEVERITY' });
    } else {
      sanitized.severity = severityResult.value;
    }

    // Thresholds validation
    const thresholdsResult = this.validateThresholds({
      alertThreshold: data.alertThreshold,
      investigationThreshold: data.investigationThreshold,
      criticalThreshold: data.criticalThreshold
    });
    if (thresholdsResult.errors.length > 0) {
      errors.push(...thresholdsResult.errors);
    } else {
      Object.assign(sanitized, thresholdsResult.sanitized);
    }

    // Keywords validation
    const keywordsResult = this.validateKeywords(data.keywords);
    if (keywordsResult.error) {
      errors.push({ field: 'keywords', message: keywordsResult.error, code: 'INVALID_KEYWORDS' });
    } else {
      sanitized.keywords = keywordsResult.value;
    }

    // Active status
    sanitized.isActive = Boolean(data.isActive !== undefined ? data.isActive : true);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate individual fields for real-time feedback
   */
  static validateField(fieldName: string, value: any): ValidationError | null {
    switch (fieldName) {
      case 'name':
        const nameResult = this.validateName(value);
        return nameResult.error ? { field: 'name', message: nameResult.error, code: 'INVALID_NAME' } : null;

      case 'description':
        const descResult = this.validateDescription(value);
        return descResult.error ? { field: 'description', message: descResult.error, code: 'INVALID_DESCRIPTION' } : null;

      case 'baseRiskScore':
        const riskResult = this.validateRiskScore(value);
        return riskResult.error ? { field: 'baseRiskScore', message: riskResult.error, code: 'INVALID_RISK_SCORE' } : null;

      case 'alertThreshold':
      case 'investigationThreshold':
      case 'criticalThreshold':
        const thresholdResult = this.validateRiskScore(value);
        return thresholdResult.error ? { field: fieldName, message: thresholdResult.error, code: 'INVALID_THRESHOLD' } : null;

      default:
        return null;
    }
  }

  /**
   * Validate name
   */
  private static validateName(name: any): { value?: string; error?: string } {
    if (!name || typeof name !== 'string') {
      return { error: 'Category name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { error: 'Category name cannot be empty' };
    }

    if (trimmed.length > this.MAX_NAME_LENGTH) {
      return { error: `Category name cannot exceed ${this.MAX_NAME_LENGTH} characters` };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_().&]+$/.test(trimmed)) {
      return { error: 'Category name contains invalid characters. Only letters, numbers, spaces, and basic punctuation allowed.' };
    }

    return { value: trimmed };
  }

  /**
   * Validate description
   */
  private static validateDescription(description: any): { value?: string | null; error?: string } {
    if (description === null || description === undefined || description === '') {
      return { value: null };
    }

    if (typeof description !== 'string') {
      return { error: 'Description must be text' };
    }

    const trimmed = description.trim();
    if (trimmed.length > this.MAX_DESCRIPTION_LENGTH) {
      return { error: `Description cannot exceed ${this.MAX_DESCRIPTION_LENGTH} characters` };
    }

    return { value: trimmed.length > 0 ? trimmed : null };
  }

  /**
   * Validate category type
   */
  private static validateCategoryType(categoryType: any): { value?: string; error?: string } {
    if (!categoryType || typeof categoryType !== 'string') {
      return { error: 'Category type is required' };
    }

    if (!this.VALID_CATEGORY_TYPES.includes(categoryType)) {
      return { error: `Invalid category type. Must be one of: ${this.VALID_CATEGORY_TYPES.join(', ')}` };
    }

    return { value: categoryType };
  }

  /**
   * Validate industry
   */
  private static validateIndustry(industry: any): { value?: string | null; error?: string } {
    if (!industry || industry === '') {
      return { value: null };
    }

    if (typeof industry !== 'string') {
      return { error: 'Industry must be text' };
    }

    const trimmed = industry.trim();
    if (!this.VALID_INDUSTRIES.includes(trimmed)) {
      return { error: `Invalid industry. Must be one of: ${this.VALID_INDUSTRIES.join(', ')}` };
    }

    return { value: trimmed };
  }

  /**
   * Validate risk score
   */
  private static validateRiskScore(riskScore: any): { value?: number; error?: string } {
    if (riskScore === null || riskScore === undefined || riskScore === '') {
      return { value: 50 }; // Default value
    }

    const score = Number(riskScore);
    if (isNaN(score)) {
      return { error: 'Risk score must be a number' };
    }

    if (score < this.MIN_RISK_SCORE || score > this.MAX_RISK_SCORE) {
      return { error: `Risk score must be between ${this.MIN_RISK_SCORE} and ${this.MAX_RISK_SCORE}` };
    }

    return { value: Math.round(score) };
  }

  /**
   * Validate severity
   */
  private static validateSeverity(severity: any): { value?: string; error?: string } {
    if (!severity || typeof severity !== 'string') {
      return { error: 'Severity is required' };
    }

    if (!this.VALID_SEVERITIES.includes(severity)) {
      return { error: `Invalid severity. Must be one of: ${this.VALID_SEVERITIES.join(', ')}` };
    }

    return { value: severity };
  }

  /**
   * Validate threshold values
   */
  private static validateThresholds(thresholds: any): { errors: ValidationError[]; sanitized: any } {
    const errors: ValidationError[] = [];
    const sanitized: any = {};

    const { alertThreshold, investigationThreshold, criticalThreshold } = thresholds;

    // Validate individual thresholds
    if (alertThreshold !== undefined) {
      const alertResult = this.validateRiskScore(alertThreshold);
      if (alertResult.error) {
        errors.push({ field: 'alertThreshold', message: alertResult.error, code: 'INVALID_ALERT_THRESHOLD' });
      } else {
        sanitized.alertThreshold = alertResult.value;
      }
    }

    if (investigationThreshold !== undefined) {
      const invResult = this.validateRiskScore(investigationThreshold);
      if (invResult.error) {
        errors.push({ field: 'investigationThreshold', message: invResult.error, code: 'INVALID_INVESTIGATION_THRESHOLD' });
      } else {
        sanitized.investigationThreshold = invResult.value;
      }
    }

    if (criticalThreshold !== undefined) {
      const critResult = this.validateRiskScore(criticalThreshold);
      if (critResult.error) {
        errors.push({ field: 'criticalThreshold', message: critResult.error, code: 'INVALID_CRITICAL_THRESHOLD' });
      } else {
        sanitized.criticalThreshold = critResult.value;
      }
    }

    // Validate threshold hierarchy only if all individual validations passed
    if (errors.length === 0) {
      const alert = sanitized.alertThreshold || 70;
      const investigation = sanitized.investigationThreshold || 85;
      const critical = sanitized.criticalThreshold || 95;

      if (alert > investigation) {
        errors.push({ 
          field: 'alertThreshold', 
          message: 'Alert threshold cannot be higher than investigation threshold', 
          code: 'THRESHOLD_HIERARCHY_VIOLATION' 
        });
      }

      if (investigation > critical) {
        errors.push({ 
          field: 'investigationThreshold', 
          message: 'Investigation threshold cannot be higher than critical threshold', 
          code: 'THRESHOLD_HIERARCHY_VIOLATION' 
        });
      }

      if (alert > critical) {
        errors.push({ 
          field: 'alertThreshold', 
          message: 'Alert threshold cannot be higher than critical threshold', 
          code: 'THRESHOLD_HIERARCHY_VIOLATION' 
        });
      }
    }

    return { errors, sanitized };
  }

  /**
   * Validate keywords array
   */
  private static validateKeywords(keywords: any): { value?: string[]; error?: string } {
    if (!keywords) {
      return { value: [] };
    }

    if (!Array.isArray(keywords)) {
      return { error: 'Keywords must be an array' };
    }

    if (keywords.length > this.MAX_KEYWORDS_COUNT) {
      return { error: `Cannot have more than ${this.MAX_KEYWORDS_COUNT} keywords` };
    }

    const sanitized: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      
      if (typeof keyword === 'string') {
        const trimmed = keyword.trim();
        if (trimmed.length === 0) continue;
        
        if (trimmed.length > this.MAX_KEYWORD_LENGTH) {
          return { error: `Keyword "${trimmed}" exceeds maximum length of ${this.MAX_KEYWORD_LENGTH}` };
        }

        // Check for duplicates (case insensitive)
        const lower = trimmed.toLowerCase();
        if (seen.has(lower)) {
          return { error: `Duplicate keyword: "${trimmed}"` };
        }
        seen.add(lower);

        sanitized.push(trimmed);
      }
    }

    return { value: sanitized };
  }

  /**
   * Real-time validation for form inputs
   */
  static getFieldValidationClass(fieldName: string, value: any, hasError: boolean): string {
    if (!value && fieldName !== 'description' && fieldName !== 'industry') {
      return 'border-gray-300 dark:border-gray-600'; // Default state
    }

    const error = this.validateField(fieldName, value);
    
    if (hasError || error) {
      return 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500';
    }

    return 'border-green-500 dark:border-green-400 focus:ring-green-500 focus:border-green-500';
  }

  /**
   * Get character count info for text fields
   */
  static getCharacterCount(value: string, maxLength: number): { count: number; remaining: number; isOverLimit: boolean; color: string } {
    const count = value ? value.length : 0;
    const remaining = maxLength - count;
    const isOverLimit = count > maxLength;
    
    let color = 'text-gray-500';
    if (count > maxLength * 0.9) {
      color = isOverLimit ? 'text-red-500' : 'text-yellow-500';
    } else if (count > maxLength * 0.7) {
      color = 'text-yellow-500';
    }

    return { count, remaining, isOverLimit, color };
  }

  /**
   * Format validation errors for display
   */
  static formatErrorMessage(error: ValidationError): string {
    return error.message;
  }

  /**
   * Get severity color classes
   */
  static getSeverityColorClass(severity: string): string {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  }

  /**
   * Generate suggestions for category names based on industry and severity
   */
  static generateCategoryNameSuggestions(industry?: string, severity?: string): string[] {
    const suggestions: string[] = [];
    
    const industryPatterns = {
      'Healthcare': ['HIPAA Violation', 'Patient Data Breach', 'Medical Record Access'],
      'Finance': ['SOX Compliance', 'Financial Fraud', 'Trading Violation'],
      'Technology': ['Source Code Theft', 'Data Exfiltration', 'System Breach'],
      'Government': ['Classified Information', 'Security Clearance', 'Public Records'],
    };

    const severityPatterns = {
      'Critical': ['Immediate Threat', 'System Compromise', 'Data Breach'],
      'High': ['Policy Violation', 'Unauthorized Access', 'Compliance Issue'],
      'Medium': ['Suspicious Activity', 'Process Deviation', 'Access Attempt'],
      'Low': ['Routine Check', 'Minor Deviation', 'Educational Alert']
    };

    if (industry && industryPatterns[industry]) {
      suggestions.push(...industryPatterns[industry]);
    }

    if (severity && severityPatterns[severity]) {
      suggestions.push(...severityPatterns[severity]);
    }

    // Add generic suggestions
    suggestions.push(
      'Insider Threat',
      'Data Loss Prevention',
      'Privilege Escalation',
      'Unusual Behavior',
      'External Communication'
    );

    return [...new Set(suggestions)].slice(0, 8); // Return unique suggestions, max 8
  }
} 