/**
 * BioClip Service - Client for communicating with the Python BioClip service
 */

const BIOCLIP_SERVICE_URL = process.env.BIOCLIP_SERVICE_URL || 'http://127.0.0.1:5000'
const BIOCLIP_TIMEOUT = parseInt(process.env.BIOCLIP_TIMEOUT || '30000', 10) // 30 seconds default

/**
 * Check if BioClip service is available
 */
export async function checkBioClipHealth() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout for health check
    
    const response = await fetch(`${BIOCLIP_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return { available: false, error: `Service returned ${response.status}` }
    }
    
    const data = await response.json()
    return {
      available: data.status === 'ok',
      modelLoaded: data.model_loaded || false,
      error: data.error || null
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { available: false, error: 'Health check timeout' }
    }
    return { available: false, error: error.message }
  }
}

/**
 * Classify a plant image using BioClip
 * @param {string} imagePath - Absolute path to the image file
 * @returns {Promise<{success: boolean, prediction?: string, confidence?: number, top_k?: Array, error?: string}>}
 */
export async function classifyImage(imagePath) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), BIOCLIP_TIMEOUT)
    
    const response = await fetch(`${BIOCLIP_SERVICE_URL}/classify`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_path: imagePath
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return {
        success: false,
        error: errorData.error || `Service returned ${response.status}`
      }
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Classification timeout - service may be busy or unavailable'
      }
    }
    return {
      success: false,
      error: error.message || 'Unknown error during classification'
    }
  }
}

/**
 * Zero-shot classification with custom prompts
 * @param {string} imagePath - Absolute path to the image file
 * @param {string[]} prompts - Optional array of plant class names
 * @returns {Promise<{success: boolean, prediction?: string, confidence?: number, top_k?: Array, error?: string}>}
 */
export async function classifyImageZeroShot(imagePath, prompts = null) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), BIOCLIP_TIMEOUT)
    
    const body = { image_path: imagePath }
    if (prompts) {
      body.prompts = prompts
    }
    
    const response = await fetch(`${BIOCLIP_SERVICE_URL}/classify/zero-shot`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return {
        success: false,
        error: errorData.error || `Service returned ${response.status}`
      }
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Classification timeout - service may be busy or unavailable'
      }
    }
    return {
      success: false,
      error: error.message || 'Unknown error during classification'
    }
  }
}

