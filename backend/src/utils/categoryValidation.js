// Category Validation Utility
// Enhanced validation and sanitization for threat categories

const CategoryValidationError = class extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CategoryValidationError';
    this.code = code;
    this.details = details;
    this.isValidation = true;
  }
};

class CategoryValidator {
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
   * Validate category creation data
   */
  static validateCreateData(data) {
    const errors = {};
    const sanitized = {};

    // Name validation
    const nameResult = this.validateName(data.name);
    if (nameResult.error) {
      errors.name = nameResult.error;
    } else {
      sanitized.name = nameResult.value;
    }

    // Description validation
    const descResult = this.validateDescription(data.description);
    if (descResult.error) {
      errors.description = descResult.error;
    } else {
      sanitized.description = descResult.value;
    }

    // Category type validation
    const typeResult = this.validateCategoryType(data.categoryType);
    if (typeResult.error) {
      errors.categoryType = typeResult.error;
    } else {
      sanitized.categoryType = typeResult.value;
    }

    // Industry validation
    const industryResult = this.validateIndustry(data.industry);
    if (industryResult.error) {
      errors.industry = industryResult.error;
    } else {
      sanitized.industry = industryResult.value;
    }

    // Risk score validation
    const riskResult = this.validateRiskScore(data.baseRiskScore);
    if (riskResult.error) {
      errors.baseRiskScore = riskResult.error;
    } else {
      sanitized.baseRiskScore = riskResult.value;
    }

    // Severity validation
    const severityResult = this.validateSeverity(data.severity);
    if (severityResult.error) {
      errors.severity = severityResult.error;
    } else {
      sanitized.severity = severityResult.value;
    }

    // Thresholds validation
    const thresholdsResult = this.validateThresholds({
      alertThreshold: data.alertThreshold,
      investigationThreshold: data.investigationThreshold,
      criticalThreshold: data.criticalThreshold
    });
    if (thresholdsResult.error) {
      Object.assign(errors, thresholdsResult.error);
    } else {
      Object.assign(sanitized, thresholdsResult.value);
    }

    // Keywords validation
    const keywordsResult = this.validateKeywords(data.keywords);
    if (keywordsResult.error) {
      errors.keywords = keywordsResult.error;
    } else {
      sanitized.keywords = keywordsResult.value;
    }

    // Detection patterns validation
    const patternsResult = this.validateDetectionPatterns(data.detectionPatterns);
    if (patternsResult.error) {
      errors.detectionPatterns = patternsResult.error;
    } else {
      sanitized.detectionPatterns = patternsResult.value;
    }

    // Risk multipliers validation
    const multipliersResult = this.validateRiskMultipliers(data.riskMultipliers);
    if (multipliersResult.error) {
      errors.riskMultipliers = multipliersResult.error;
    } else {
      sanitized.riskMultipliers = multipliersResult.value;
    }

    // Active status validation
    sanitized.isActive = Boolean(data.isActive !== undefined ? data.isActive : true);

    if (Object.keys(errors).length > 0) {
      throw new CategoryValidationError(
        'Category validation failed',
        'VALIDATION_ERROR',
        { errors, provided: data }
      );
    }

    return sanitized;
  }

  /**
   * Validate category update data
   */
  static validateUpdateData(data, existingCategory) {
    const errors = {};
    const sanitized = {};

    // Only validate provided fields
    if (data.name !== undefined) {
      const nameResult = this.validateName(data.name);
      if (nameResult.error) {
        errors.name = nameResult.error;
      } else {
        sanitized.name = nameResult.value;
      }
    }

    if (data.description !== undefined) {
      const descResult = this.validateDescription(data.description);
      if (descResult.error) {
        errors.description = descResult.error;
      } else {
        sanitized.description = descResult.value;
      }
    }

    if (data.industry !== undefined) {
      const industryResult = this.validateIndustry(data.industry);
      if (industryResult.error) {
        errors.industry = industryResult.error;
      } else {
        sanitized.industry = industryResult.value;
      }
    }

    if (data.baseRiskScore !== undefined) {
      const riskResult = this.validateRiskScore(data.baseRiskScore);
      if (riskResult.error) {
        errors.baseRiskScore = riskResult.error;
      } else {
        sanitized.baseRiskScore = riskResult.value;
      }
    }

    if (data.severity !== undefined) {
      const severityResult = this.validateSeverity(data.severity);
      if (severityResult.error) {
        errors.severity = severityResult.error;
      } else {
        sanitized.severity = severityResult.value;
      }
    }

    // Validate thresholds if any are provided
    const thresholdFields = ['alertThreshold', 'investigationThreshold', 'criticalThreshold'];
    const providedThresholds = {};
    thresholdFields.forEach(field => {
      if (data[field] !== undefined) {
        providedThresholds[field] = data[field];
      } else if (existingCategory) {
        // Use existing values for validation
        const mapping = {
          alertThreshold: 'alert_threshold',
          investigationThreshold: 'investigation_threshold',
          criticalThreshold: 'critical_threshold'
        };
        providedThresholds[field] = existingCategory[mapping[field]];
      }
    });

    if (Object.keys(providedThresholds).length > 0) {
      const thresholdsResult = this.validateThresholds(providedThresholds);
      if (thresholdsResult.error) {
        Object.assign(errors, thresholdsResult.error);
      } else {
        Object.assign(sanitized, thresholdsResult.value);
      }
    }

    if (data.keywords !== undefined) {
      const keywordsResult = this.validateKeywords(data.keywords);
      if (keywordsResult.error) {
        errors.keywords = keywordsResult.error;
      } else {
        sanitized.keywords = keywordsResult.value;
      }
    }

    if (data.detectionPatterns !== undefined) {
      const patternsResult = this.validateDetectionPatterns(data.detectionPatterns);
      if (patternsResult.error) {
        errors.detectionPatterns = patternsResult.error;
      } else {
        sanitized.detectionPatterns = patternsResult.value;
      }
    }

    if (data.riskMultipliers !== undefined) {
      const multipliersResult = this.validateRiskMultipliers(data.riskMultipliers);
      if (multipliersResult.error) {
        errors.riskMultipliers = multipliersResult.error;
      } else {
        sanitized.riskMultipliers = multipliersResult.value;
      }
    }

    if (data.isActive !== undefined) {
      sanitized.isActive = Boolean(data.isActive);
    }

    if (Object.keys(errors).length > 0) {
      throw new CategoryValidationError(
        'Category validation failed',
        'VALIDATION_ERROR',
        { errors, provided: data }
      );
    }

    return sanitized;
  }

  /**
   * Validate category name
   */
  static validateName(name) {
    if (!name || typeof name !== 'string') {
      return { error: 'Category name is required and must be a string' };
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
      return { error: 'Category name contains invalid characters' };
    }

    return { value: trimmed };
  }

  /**
   * Validate description
   */
  static validateDescription(description) {
    if (description === null || description === undefined) {
      return { value: null };
    }

    if (typeof description !== 'string') {
      return { error: 'Description must be a string' };
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
  static validateCategoryType(categoryType) {
    if (!categoryType || typeof categoryType !== 'string') {
      return { error: 'Category type is required' };
    }

    if (!this.VALID_CATEGORY_TYPES.includes(categoryType)) {
      return { 
        error: `Invalid category type. Must be one of: ${this.VALID_CATEGORY_TYPES.join(', ')}` 
      };
    }

    return { value: categoryType };
  }

  /**
   * Validate industry
   */
  static validateIndustry(industry) {
    if (!industry || industry === '') {
      return { value: null };
    }

    if (typeof industry !== 'string') {
      return { error: 'Industry must be a string' };
    }

    const trimmed = industry.trim();
    if (!this.VALID_INDUSTRIES.includes(trimmed)) {
      return { 
        error: `Invalid industry. Must be one of: ${this.VALID_INDUSTRIES.join(', ')}` 
      };
    }

    return { value: trimmed };
  }

  /**
   * Validate risk score
   */
  static validateRiskScore(riskScore) {
    if (riskScore === null || riskScore === undefined) {
      return { value: 50 }; // Default value
    }

    const score = Number(riskScore);
    if (isNaN(score)) {
      return { error: 'Risk score must be a number' };
    }

    if (score < this.MIN_RISK_SCORE || score > this.MAX_RISK_SCORE) {
      return { 
        error: `Risk score must be between ${this.MIN_RISK_SCORE} and ${this.MAX_RISK_SCORE}` 
      };
    }

    return { value: Math.round(score) };
  }

  /**
   * Validate severity
   */
  static validateSeverity(severity) {
    if (!severity || typeof severity !== 'string') {
      return { error: 'Severity is required' };
    }

    if (!this.VALID_SEVERITIES.includes(severity)) {
      return { 
        error: `Invalid severity. Must be one of: ${this.VALID_SEVERITIES.join(', ')}` 
      };
    }

    return { value: severity };
  }

  /**
   * Validate threshold values
   */
  static validateThresholds(thresholds) {
    const errors = {};
    const sanitized = {};

    const { alertThreshold, investigationThreshold, criticalThreshold } = thresholds;

    // Validate individual thresholds
    if (alertThreshold !== undefined) {
      const alertResult = this.validateRiskScore(alertThreshold);
      if (alertResult.error) {
        errors.alertThreshold = alertResult.error;
      } else {
        sanitized.alertThreshold = alertResult.value;
      }
    }

    if (investigationThreshold !== undefined) {
      const invResult = this.validateRiskScore(investigationThreshold);
      if (invResult.error) {
        errors.investigationThreshold = invResult.error;
      } else {
        sanitized.investigationThreshold = invResult.value;
      }
    }

    if (criticalThreshold !== undefined) {
      const critResult = this.validateRiskScore(criticalThreshold);
      if (critResult.error) {
        errors.criticalThreshold = critResult.error;
      } else {
        sanitized.criticalThreshold = critResult.value;
      }
    }

    // Validate threshold hierarchy (alert <= investigation <= critical)
    if (Object.keys(errors).length === 0) {
      const alert = sanitized.alertThreshold || 70;
      const investigation = sanitized.investigationThreshold || 85;
      const critical = sanitized.criticalThreshold || 95;

      if (alert > investigation) {
        errors.alertThreshold = 'Alert threshold cannot be higher than investigation threshold';
      }

      if (investigation > critical) {
        errors.investigationThreshold = 'Investigation threshold cannot be higher than critical threshold';
      }

      if (alert > critical) {
        errors.alertThreshold = 'Alert threshold cannot be higher than critical threshold';
      }
    }

    if (Object.keys(errors).length > 0) {
      return { error: errors };
    }

    return { value: sanitized };
  }

  /**
   * Validate keywords array
   */
  static validateKeywords(keywords) {
    if (!keywords) {
      return { value: [] };
    }

    if (!Array.isArray(keywords)) {
      return { error: 'Keywords must be an array' };
    }

    if (keywords.length > this.MAX_KEYWORDS_COUNT) {
      return { error: `Cannot have more than ${this.MAX_KEYWORDS_COUNT} keywords` };
    }

    const sanitized = [];
    const seen = new Set();

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

        sanitized.push({
          keyword: trimmed,
          weight: 1.0,
          isPhrase: trimmed.includes(' ')
        });
      } else if (typeof keyword === 'object' && keyword.keyword) {
        const trimmed = keyword.keyword.trim();
        if (trimmed.length === 0) continue;

        if (trimmed.length > this.MAX_KEYWORD_LENGTH) {
          return { error: `Keyword "${trimmed}" exceeds maximum length of ${this.MAX_KEYWORD_LENGTH}` };
        }

        const lower = trimmed.toLowerCase();
        if (seen.has(lower)) {
          return { error: `Duplicate keyword: "${trimmed}"` };
        }
        seen.add(lower);

        const weight = Number(keyword.weight || 1.0);
        if (isNaN(weight) || weight < 0.1 || weight > 5.0) {
          return { error: `Invalid weight for keyword "${trimmed}". Must be between 0.1 and 5.0` };
        }

        sanitized.push({
          keyword: trimmed,
          weight: Number(weight.toFixed(1)),
          isPhrase: Boolean(keyword.isPhrase !== undefined ? keyword.isPhrase : trimmed.includes(' '))
        });
      }
    }

    return { value: sanitized };
  }

  /**
   * Validate detection patterns
   */
  static validateDetectionPatterns(patterns) {
    if (!patterns) {
      return { value: {} };
    }

    if (typeof patterns !== 'object' || Array.isArray(patterns)) {
      return { error: 'Detection patterns must be an object' };
    }

    const sanitized = {};
    const validPatternTypes = [
      'emailPatterns', 'behavioralPatterns', 'timePatterns', 'attachmentPatterns',
      'accessPatterns', 'communicationPatterns', 'compliancePatterns',
      'documentPatterns', 'systemPatterns', 'paymentPatterns'
    ];

    for (const [key, value] of Object.entries(patterns)) {
      if (!validPatternTypes.includes(key)) {
        return { error: `Invalid pattern type: ${key}` };
      }

      if (!Array.isArray(value)) {
        return { error: `Pattern ${key} must be an array` };
      }

      const cleanedPatterns = value
        .filter(p => typeof p === 'string' && p.trim().length > 0)
        .map(p => p.trim());

      if (cleanedPatterns.length > 0) {
        sanitized[key] = cleanedPatterns;
      }
    }

    return { value: sanitized };
  }

  /**
   * Validate risk multipliers
   */
  static validateRiskMultipliers(multipliers) {
    if (!multipliers) {
      return { value: {} };
    }

    if (typeof multipliers !== 'object' || Array.isArray(multipliers)) {
      return { error: 'Risk multipliers must be an object' };
    }

    const sanitized = {};
    const validMultiplierTypes = [
      'afterHours', 'externalRecipient', 'largeAttachment', 'frequency',
      'competitorContact', 'externalContact', 'bulkExport', 'personalEmail',
      'weekendSubmission', 'roundNumbers', 'duplicateVendor', 'urgentProcessing'
    ];

    for (const [key, value] of Object.entries(multipliers)) {
      if (!validMultiplierTypes.includes(key)) {
        return { error: `Invalid multiplier type: ${key}` };
      }

      const multiplier = Number(value);
      if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 10.0) {
        return { error: `Invalid multiplier value for ${key}. Must be between 0.1 and 10.0` };
      }

      sanitized[key] = Number(multiplier.toFixed(1));
    }

    return { value: sanitized };
  }

  /**
   * Validate that category can be deleted
   */
  static validateDeletion(category, usageInfo = {}) {
    const errors = [];

    if (category.is_system_category) {
      errors.push('Cannot delete system categories');
    }

    if (usageInfo.policyCount > 0) {
      errors.push(`Category is used in ${usageInfo.policyCount} policies`);
    }

    if (usageInfo.recentDetections > 0) {
      errors.push(`Category has ${usageInfo.recentDetections} recent detections`);
    }

    if (errors.length > 0) {
      throw new CategoryValidationError(
        'Category cannot be deleted',
        'DELETION_NOT_ALLOWED',
        { errors, usage: usageInfo }
      );
    }

    return true;
  }

  /**
   * Sanitize search and filter parameters
   */
  static sanitizeFilters(filters) {
    const sanitized = {};

    if (filters.search) {
      sanitized.search = String(filters.search).trim().substring(0, 100);
    }

    if (filters.categoryType && this.VALID_CATEGORY_TYPES.includes(filters.categoryType)) {
      sanitized.categoryType = filters.categoryType;
    }

    if (filters.severity && this.VALID_SEVERITIES.includes(filters.severity)) {
      sanitized.severity = filters.severity;
    }

    if (filters.industry && this.VALID_INDUSTRIES.includes(filters.industry)) {
      sanitized.industry = filters.industry;
    }

    if (filters.isActive !== undefined) {
      sanitized.isActive = Boolean(filters.isActive);
    }

    return sanitized;
  }
}

module.exports = {
  CategoryValidator,
  CategoryValidationError
}; 