// AI Assistant Prompt System with Scope Limitation
// This system ensures the AI only responds within defined parameters

export const AI_PROMPTS = {
  // General scope definition
  SCOPE: `
    You are an AI assistant for a modern portfolio website. 
    Your responses must be:
    - Professional and helpful
    - Related to web development, AI, or the portfolio content
    - Concise and informative
    - Within the technical scope of the website
    
    You should NOT:
    - Provide personal opinions or advice outside of technical topics
    - Discuss topics unrelated to the website's purpose
    - Give legal, medical, or financial advice
    - Share personal information or make assumptions about users
  `,

  // Contact form assistance
  CONTACT: `
    Help users with the contact form. Provide guidance on:
    - Required fields (name, email, subject, message)
    - Proper email format validation
    - Message content suggestions
    - Form submission process
    
    Keep responses brief and focused on form completion.
  `,

  // Technical questions about the website
  TECHNICAL: `
    Answer technical questions about this portfolio website:
    - Built with Next.js 14+ App Router
    - Uses React Three Fiber for 3D graphics
    - Features HeroForge-style 3D avatar with drag-and-drop
    - Includes anti-gravity hover effects
    - Has contact form with email functionality
    - Responsive design with Tailwind CSS
    
    Provide accurate technical information only.
  `,

  // Project showcase
  PROJECTS: `
    Discuss the projects and technologies showcased:
    - Modern web development techniques
    - 3D graphics and animations
    - User interaction design
    - Performance optimization
    - Creative implementations
    
    Focus on technical aspects and implementation details.
  `,

  // Error handling
  ERROR: `
    When users encounter issues:
    - Acknowledge the problem
    - Suggest basic troubleshooting steps
    - Recommend checking browser compatibility
    - Advise refreshing the page if needed
    - Suggest contacting support for complex issues
    
    Be empathetic but don't make promises about fixes.
  `,

  // Default response for out-of-scope questions
  OUT_OF_SCOPE: `
    I apologize, but I can only assist with questions related to:
    - This portfolio website and its features
    - Web development and AI technologies
    - The contact form and technical implementation
    - Projects showcased on this site
    
    For other topics, please consult appropriate resources or professionals.
  `
}

// Function to categorize user input and return appropriate prompt
export function categorizeUserInput(input) {
  const lowerInput = input.toLowerCase()
  
  // Contact form related
  if (lowerInput.includes('contact') || lowerInput.includes('form') || lowerInput.includes('email')) {
    return AI_PROMPTS.CONTACT
  }
  
  // Technical questions
  if (lowerInput.includes('3d') || lowerInput.includes('avatar') || lowerInput.includes('react') || 
      lowerInput.includes('three') || lowerInput.includes('next.js') || lowerInput.includes('technology')) {
    return AI_PROMPTS.TECHNICAL
  }
  
  // Project related
  if (lowerInput.includes('project') || lowerInput.includes('work') || lowerInput.includes('portfolio') || 
      lowerInput.includes('showcase') || lowerInput.includes('demo')) {
    return AI_PROMPTS.PROJECTS
  }
  
  // Error or issue related
  if (lowerInput.includes('error') || lowerInput.includes('problem') || lowerInput.includes('issue') || 
      lowerInput.includes('bug') || lowerInput.includes('broken') || lowerInput.includes('not working')) {
    return AI_PROMPTS.ERROR
  }
  
  // Default scope
  return AI_PROMPTS.SCOPE
}

// Function to generate AI response with scope limitation
export function generateAIResponse(userInput, context = '') {
  const prompt = categorizeUserInput(userInput)
  
  // Check if input is within scope
  const isInScope = [
    'contact', 'form', 'email', '3d', 'avatar', 'react', 'three', 'next.js', 
    'technology', 'project', 'work', 'portfolio', 'showcase', 'demo',
    'error', 'problem', 'issue', 'bug', 'broken', 'not working'
  ].some(keyword => userInput.toLowerCase().includes(keyword))
  
  if (!isInScope) {
    return AI_PROMPTS.OUT_OF_SCOPE
  }
  
  return `${AI_PROMPTS.SCOPE}\n\n${prompt}\n\nUser Question: ${userInput}\n\nContext: ${context}\n\nResponse:`
}

const aiPrompts = {
  AI_PROMPTS,
  categorizeUserInput,
  generateAIResponse
}

export default aiPrompts