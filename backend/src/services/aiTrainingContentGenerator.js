const OpenAI = require('openai');
const { pool } = require('../utils/database');

/**
 * AI Training Content Generator Service
 * 
 * Generates training content using OpenAI based on:
 * - Compliance requirements (GDPR, SOX, HIPAA, PCI DSS)
 * - Employee roles and departments
 * - Difficulty levels and content types
 * - Regulatory updates and best practices
 */

class AITrainingContentGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
    });

    this.contentConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.7, // Balanced creativity for training content
      maxTokens: 4000, // Allow for comprehensive content
      quizModel: 'gpt-4o-mini',
      quizTemperature: 0.4, // More deterministic for quizzes
      quizMaxTokens: 2000
    };

    this.regulationKnowledge = {
      gdpr: {
        name: 'General Data Protection Regulation',
        keyAreas: ['data protection', 'privacy rights', 'consent', 'data breaches', 'cross-border transfers'],
        targetAudiences: ['all_employees', 'data_processors', 'privacy_officers', 'it_staff'],
        trainingFrequency: 'annual'
      },
      sox: {
        name: 'Sarbanes-Oxley Act',
        keyAreas: ['financial reporting', 'internal controls', 'audit trails', 'executive certification'],
        targetAudiences: ['finance_team', 'executives', 'auditors', 'controllers'],
        trainingFrequency: 'annual'
      },
      hipaa: {
        name: 'Health Insurance Portability and Accountability Act',
        keyAreas: ['protected health information', 'security safeguards', 'breach notification', 'business associates'],
        targetAudiences: ['healthcare_workers', 'it_staff', 'administrators', 'third_party_vendors'],
        trainingFrequency: 'annual'
      },
      pci_dss: {
        name: 'Payment Card Industry Data Security Standard',
        keyAreas: ['cardholder data', 'secure networks', 'access controls', 'monitoring', 'vulnerability management'],
        targetAudiences: ['payment_processors', 'it_staff', 'customer_service', 'managers'],
        trainingFrequency: 'quarterly'
      }
    };

    this.contentTemplates = {
      overview: 'comprehensive_overview',
      specific_topic: 'focused_deep_dive',
      scenario_based: 'real_world_scenarios',
      interactive: 'interactive_exercises',
      quiz: 'knowledge_assessment',
      case_study: 'practical_case_studies'
    };
  }

  /**
   * Generate comprehensive training content for a specific regulation
   */
  async generateTrainingContent(options) {
    const {
      regulation,
      contentType = 'overview',
      targetAudience = 'all_employees',
      difficultyLevel = 1,
      estimatedDuration = 30,
      specificTopics = [],
      includeQuiz = true,
      requestedBy,
      categoryId
    } = options;

    console.log(`🤖 Generating ${contentType} training content for ${regulation}...`);

    try {
      const generationId = await this.logGenerationRequest(options, requestedBy);

      // Generate main content
      const mainContent = await this.generateMainContent(regulation, contentType, targetAudience, difficultyLevel, estimatedDuration, specificTopics);

      // Generate quiz if requested
      let quizContent = null;
      if (includeQuiz) {
        quizContent = await this.generateQuizContent(regulation, targetAudience, difficultyLevel, mainContent.title);
      }

      // Store generated content in database
      const contentId = await this.storeGeneratedContent({
        categoryId,
        regulation,
        contentType,
        targetAudience,
        difficultyLevel,
        estimatedDuration,
        mainContent,
        quizContent,
        requestedBy,
        generationId
      });

      await this.updateGenerationLog(generationId, true, { contentId });

      console.log(`✅ Successfully generated training content ID: ${contentId}`);

      return {
        success: true,
        contentId,
        mainContent,
        quizContent,
        generationId
      };

    } catch (error) {
      console.error(`❌ Failed to generate training content for ${regulation}:`, error);
      throw error;
    }
  }

  /**
   * Generate main training content using AI
   */
  async generateMainContent(regulation, contentType, targetAudience, difficultyLevel, estimatedDuration, specificTopics) {
    const regulationInfo = this.regulationKnowledge[regulation];
    if (!regulationInfo) {
      throw new Error(`Unknown regulation: ${regulation}`);
    }

    const prompt = this.createContentPrompt(regulation, regulationInfo, contentType, targetAudience, difficultyLevel, estimatedDuration, specificTopics);

    console.log(`🧠 Generating main content with AI...`);

    const response = await this.openai.chat.completions.create({
      model: this.contentConfig.model,
      temperature: this.contentConfig.temperature,
      max_tokens: this.contentConfig.maxTokens,
      messages: [
        {
          role: "system",
          content: `You are an expert compliance training content creator with deep knowledge of regulatory requirements and adult learning principles.

Your task is to create engaging, accurate, and practical training content that helps employees understand and comply with regulations.

Key principles:
- Make content relatable and practical
- Use real-world examples and scenarios
- Ensure accuracy and up-to-date information
- Create content appropriate for the target audience
- Include actionable takeaways
- Structure content for optimal learning retention

Always provide content in a structured format with clear headings, bullet points, and practical examples.`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const generatedContent = response.choices[0].message.content;
    
    // Parse the generated content to extract structured information
    const parsedContent = this.parseGeneratedContent(generatedContent, regulation, contentType);
    
    return parsedContent;
  }

  /**
   * Generate quiz content for training assessment
   */
  async generateQuizContent(regulation, targetAudience, difficultyLevel, trainingTitle) {
    const regulationInfo = this.regulationKnowledge[regulation];
    const prompt = this.createQuizPrompt(regulation, regulationInfo, targetAudience, difficultyLevel, trainingTitle);

    console.log(`📝 Generating quiz content with AI...`);

    const response = await this.openai.chat.completions.create({
      model: this.contentConfig.quizModel,
      temperature: this.contentConfig.quizTemperature,
      max_tokens: this.contentConfig.quizMaxTokens,
      messages: [
        {
          role: "system",
          content: `You are an expert at creating compliance training assessments that effectively test understanding and retention.

Create quiz questions that:
- Test both knowledge and practical application
- Include realistic scenarios
- Have clear, unambiguous correct answers
- Provide educational explanations for each answer
- Match the appropriate difficulty level
- Cover key learning objectives

Always format quizzes as JSON with structured question objects.`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const generatedQuiz = response.choices[0].message.content;
    
    try {
      // Parse JSON quiz content
      const quizData = JSON.parse(generatedQuiz);
      return this.validateAndFormatQuiz(quizData);
    } catch (error) {
      console.error('Failed to parse quiz JSON:', error);
      // Return a basic quiz structure if parsing fails
      return this.createFallbackQuiz(regulation, targetAudience);
    }
  }

  /**
   * Create content generation prompt
   */
  createContentPrompt(regulation, regulationInfo, contentType, targetAudience, difficultyLevel, estimatedDuration, specificTopics) {
    const audienceContext = this.getAudienceContext(targetAudience);
    const difficultyContext = this.getDifficultyContext(difficultyLevel);
    const topicsContext = specificTopics.length > 0 ? `Focus specifically on: ${specificTopics.join(', ')}` : '';

    return `Create comprehensive training content for ${regulationInfo.name} (${regulation.toUpperCase()}).

REQUIREMENTS:
- Content Type: ${contentType}
- Target Audience: ${audienceContext}
- Difficulty Level: ${difficultyContext}
- Estimated Duration: ${estimatedDuration} minutes
- Key Areas: ${regulationInfo.keyAreas.join(', ')}
${topicsContext}

CONTENT STRUCTURE REQUIRED:
1. **Title**: Clear, engaging title
2. **Learning Objectives**: 3-5 specific learning outcomes
3. **Introduction**: Why this regulation matters (2-3 paragraphs)
4. **Key Concepts**: Main regulation concepts with explanations
5. **Practical Examples**: Real-world scenarios relevant to ${targetAudience}
6. **Do's and Don'ts**: Actionable guidelines
7. **Common Mistakes**: What to avoid with examples
8. **Implementation Steps**: How to apply this knowledge
9. **Resources**: Additional reading and reference materials
10. **Summary**: Key takeaways and action items

FORMAT:
- Use clear headings and subheadings
- Include bullet points for easy scanning
- Add practical examples throughout
- Make it engaging and interactive where possible
- Ensure content is appropriate for ${estimatedDuration}-minute session

Make the content practical, engaging, and directly applicable to daily work responsibilities.`;
  }

  /**
   * Create quiz generation prompt
   */
  createQuizPrompt(regulation, regulationInfo, targetAudience, difficultyLevel, trainingTitle) {
    const audienceContext = this.getAudienceContext(targetAudience);
    const difficultyContext = this.getDifficultyContext(difficultyLevel);

    return `Create a comprehensive quiz for the training: "${trainingTitle}"

QUIZ REQUIREMENTS:
- Regulation: ${regulationInfo.name} (${regulation.toUpperCase()})
- Target Audience: ${audienceContext}
- Difficulty Level: ${difficultyContext}
- Number of Questions: ${difficultyLevel === 1 ? '5-7' : difficultyLevel === 2 ? '8-10' : '10-12'}
- Question Types: Multiple choice, True/False, Scenario-based

QUESTION CATEGORIES:
- Basic Knowledge (${difficultyLevel === 1 ? '60%' : '40%'})
- Practical Application (${difficultyLevel === 1 ? '30%' : '40%'})
- Scenario Analysis (${difficultyLevel === 1 ? '10%' : '20%'})

RESPONSE FORMAT (JSON):
{
  "quiz_title": "Quiz title",
  "passing_score": 80,
  "time_limit_minutes": ${Math.ceil(difficultyLevel * 10)},
  "instructions": "Quiz instructions",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Why this answer is correct",
      "points": 1,
      "category": "basic_knowledge|practical_application|scenario_analysis"
    }
  ]
}

Ensure questions test understanding, not just memorization. Include realistic workplace scenarios.`;
  }

  /**
   * Parse and structure generated content
   */
  parseGeneratedContent(content, regulation, contentType) {
    // Extract title (first line or ## heading)
    const titleMatch = content.match(/^#?\s*(.+?)$/m) || content.match(/^\*\*(.+?)\*\*/m);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : `${regulation.toUpperCase()} Training - ${contentType}`;

    // Extract learning objectives
    const objectivesMatch = content.match(/(?:learning objectives?|objectives?):?\s*\n((?:[-*]\s*.+\n?)+)/i);
    let learningObjectives = [];
    if (objectivesMatch) {
      learningObjectives = objectivesMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(obj => obj.length > 0);
    }

    return {
      title,
      content: content,
      learning_objectives: learningObjectives,
      word_count: content.split(/\s+/).length,
      estimated_reading_time: Math.ceil(content.split(/\s+/).length / 200), // 200 words per minute
      structure_quality: this.assessContentStructure(content),
      regulation_coverage: this.assessRegulationCoverage(content, regulation)
    };
  }

  /**
   * Validate and format quiz content
   */
  validateAndFormatQuiz(quizData) {
    // Ensure required fields exist
    const formattedQuiz = {
      quiz_title: quizData.quiz_title || 'Compliance Training Quiz',
      passing_score: quizData.passing_score || 80,
      time_limit_minutes: quizData.time_limit_minutes || 15,
      instructions: quizData.instructions || 'Answer all questions to the best of your ability.',
      total_questions: quizData.questions?.length || 0,
      total_points: 0,
      questions: []
    };

    // Validate and format questions
    if (quizData.questions && Array.isArray(quizData.questions)) {
      formattedQuiz.questions = quizData.questions.map((q, index) => {
        const formattedQuestion = {
          id: q.id || index + 1,
          type: q.type || 'multiple_choice',
          question: q.question || 'Sample question',
          points: q.points || 1,
          category: q.category || 'basic_knowledge',
          explanation: q.explanation || 'Explanation not provided'
        };

        // Add type-specific fields
        if (q.type === 'multiple_choice') {
          formattedQuestion.options = q.options || ['Option A', 'Option B', 'Option C', 'Option D'];
          formattedQuestion.correct_answer = q.correct_answer || 0;
        } else if (q.type === 'true_false') {
          formattedQuestion.correct_answer = q.correct_answer || true;
        }

        formattedQuiz.total_points += formattedQuestion.points;
        return formattedQuestion;
      });
    }

    return formattedQuiz;
  }

  /**
   * Store generated content in database
   */
  async storeGeneratedContent(data) {
    const {
      categoryId,
      regulation,
      contentType,
      targetAudience,
      difficultyLevel,
      estimatedDuration,
      mainContent,
      quizContent,
      requestedBy,
      generationId
    } = data;

    try {
      // Store main content
      const contentResult = await pool.query(`
        INSERT INTO training_content (
          category_id, title, description, content_type, content_format, content_body,
          applicable_regulations, compliance_level, ai_generated, ai_model, 
          ai_generation_date, difficulty_level, estimated_duration_minutes,
          author_id, status, content_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        categoryId,
        mainContent.title,
        `AI-generated ${regulation.toUpperCase()} training content for ${targetAudience}`,
        contentType,
        'html',
        mainContent.content,
        [regulation],
        'required',
        true,
        this.contentConfig.model,
        new Date(),
        difficultyLevel,
        estimatedDuration,
        requestedBy,
        'review',
        JSON.stringify({
          learning_objectives: mainContent.learning_objectives,
          word_count: mainContent.word_count,
          reading_time: mainContent.estimated_reading_time,
          target_audience: targetAudience,
          generation_id: generationId,
          quiz_included: !!quizContent
        })
      ]);

      const contentId = contentResult.rows[0].id;

      // Store quiz content if generated
      if (quizContent) {
        await pool.query(`
          INSERT INTO training_content (
            category_id, title, description, content_type, content_format, content_body,
            applicable_regulations, compliance_level, ai_generated, ai_model,
            ai_generation_date, difficulty_level, estimated_duration_minutes,
            author_id, status, content_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          categoryId,
          `${mainContent.title} - Assessment`,
          `Quiz for ${mainContent.title}`,
          'quiz',
          'json',
          JSON.stringify(quizContent),
          [regulation],
          'required',
          true,
          this.contentConfig.quizModel,
          new Date(),
          difficultyLevel,
          quizContent.time_limit_minutes || 15,
          requestedBy,
          'review',
          JSON.stringify({
            parent_content_id: contentId,
            total_questions: quizContent.total_questions,
            total_points: quizContent.total_points,
            passing_score: quizContent.passing_score,
            generation_id: generationId
          })
        ]);
      }

      return contentId;

    } catch (error) {
      console.error('Error storing generated content:', error);
      throw error;
    }
  }

  /**
   * Log content generation request
   */
  async logGenerationRequest(options, requestedBy) {
    try {
      const result = await pool.query(`
        INSERT INTO ai_training_generation_log (
          requested_by, generation_type, regulation_focus, target_audience,
          difficulty_level, estimated_duration, content_type, ai_model,
          full_prompt, generation_parameters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        requestedBy,
        'full_content',
        [options.regulation],
        options.targetAudience,
        options.difficultyLevel,
        options.estimatedDuration,
        options.contentType,
        this.contentConfig.model,
        'Generated with AI Training Content Generator',
        JSON.stringify({
          temperature: this.contentConfig.temperature,
          max_tokens: this.contentConfig.maxTokens,
          include_quiz: options.includeQuiz
        })
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error logging generation request:', error);
      throw error;
    }
  }

  /**
   * Update generation log with results
   */
  async updateGenerationLog(generationId, success, results = {}) {
    try {
      await pool.query(`
        UPDATE ai_training_generation_log 
        SET 
          generation_success = $1,
          generated_content = $2,
          content_quality_score = $3,
          times_used = times_used + 1
        WHERE id = $4
      `, [
        success,
        success ? 'Content generated successfully' : 'Generation failed',
        success ? 85 : 0, // Base quality score
        generationId
      ]);
    } catch (error) {
      console.error('Error updating generation log:', error);
    }
  }

  /**
   * Helper methods
   */
  getAudienceContext(targetAudience) {
    const contexts = {
      'all_employees': 'All employees across the organization',
      'managers': 'Management and supervisory staff',
      'it_staff': 'IT and technical personnel',
      'finance_team': 'Finance and accounting professionals',
      'hr_team': 'Human resources staff',
      'executives': 'Executive leadership and C-suite',
      'customer_service': 'Customer-facing staff',
      'data_processors': 'Employees handling personal data'
    };
    return contexts[targetAudience] || targetAudience;
  }

  getDifficultyContext(level) {
    const contexts = {
      1: 'Beginner level - basic concepts and awareness',
      2: 'Intermediate level - practical application and scenarios',
      3: 'Advanced level - complex situations and expert knowledge',
      4: 'Expert level - comprehensive understanding and leadership',
      5: 'Specialist level - deep technical expertise and policy development'
    };
    return contexts[level] || 'General level';
  }

  assessContentStructure(content) {
    let score = 0;
    
    // Check for headings
    if (content.match(/^#+\s/m)) score += 20;
    
    // Check for bullet points
    if (content.match(/^[-*]\s/m)) score += 20;
    
    // Check for examples
    if (content.toLowerCase().includes('example')) score += 20;
    
    // Check for practical sections
    if (content.toLowerCase().includes('practical') || content.toLowerCase().includes('implementation')) score += 20;
    
    // Check for summary
    if (content.toLowerCase().includes('summary') || content.toLowerCase().includes('takeaway')) score += 20;
    
    return score;
  }

  assessRegulationCoverage(content, regulation) {
    const regulationInfo = this.regulationKnowledge[regulation];
    if (!regulationInfo) return 0;

    let coverage = 0;
    const totalAreas = regulationInfo.keyAreas.length;
    
    regulationInfo.keyAreas.forEach(area => {
      if (content.toLowerCase().includes(area.toLowerCase())) {
        coverage += 100 / totalAreas;
      }
    });

    return Math.round(coverage);
  }

  createFallbackQuiz(regulation, targetAudience) {
    return {
      quiz_title: `${regulation.toUpperCase()} Compliance Quiz`,
      passing_score: 80,
      time_limit_minutes: 10,
      instructions: 'Please answer all questions to complete your training.',
      total_questions: 3,
      total_points: 3,
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          question: `What is the primary purpose of ${regulation.toUpperCase()}?`,
          options: ['Data protection', 'Financial compliance', 'Security standards', 'All of the above'],
          correct_answer: 3,
          explanation: 'This regulation covers multiple aspects of compliance.',
          points: 1,
          category: 'basic_knowledge'
        },
        {
          id: 2,
          type: 'true_false',
          question: `${regulation.toUpperCase()} compliance is optional for our organization.`,
          correct_answer: false,
          explanation: 'Compliance with applicable regulations is mandatory.',
          points: 1,
          category: 'basic_knowledge'
        },
        {
          id: 3,
          type: 'multiple_choice',
          question: 'Who is responsible for ensuring compliance in your daily work?',
          options: ['Only managers', 'Only compliance officers', 'Every employee', 'Only IT staff'],
          correct_answer: 2,
          explanation: 'Every employee has a role in maintaining compliance.',
          points: 1,
          category: 'practical_application'
        }
      ]
    };
  }
}

module.exports = AITrainingContentGenerator; 