const axios = require('axios');
async function resolveGoogleMapsShortLink(shortUrl) {
  try {
    // Validate URL format first
    if (!shortUrl || typeof shortUrl !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Check if URL is properly formatted
    try {
      new URL(shortUrl);
    } catch (urlError) {
      throw new Error('Invalid URL format');
    }

    // Make a GET request to follow redirects and get the final URL
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      timeout: 8000, // Reduced timeout to 8 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      validateStatus: function (status) {
        // Accept redirects and successful responses
        return status >= 200 && status < 400;
      }
    });

    // Extract the final URL from the response
    const finalUrl = response.request?.res?.responseUrl || response.config?.url || response.request?.responseURL;
    
    if (!finalUrl) {
      throw new Error('Could not resolve short link - no final URL found');
    }

    // Parse coordinates from the resolved URL
    const coords = extractCoordinatesFromUrl(finalUrl);
    
    if (!coords) {
      throw new Error('Could not extract coordinates from resolved URL');
    }

    return {
      resolvedUrl: finalUrl,
      coordinates: coords
    };
  } catch (error) {
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout resolving short link:', shortUrl);
      throw new Error('Request timeout - URL resolution took too long');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error resolving short link:', shortUrl);
      throw new Error('Network error - could not reach the URL');
    } else if (error.response?.status >= 400) {
      console.error('HTTP error resolving short link:', error.response.status, shortUrl);
      throw new Error(`HTTP error ${error.response.status} - URL may be invalid or inaccessible`);
    } else {
      console.error('Error resolving short link:', error.message, shortUrl);
      throw new Error(`Failed to resolve short link: ${error.message}`);
    }
  }
}

function extractCoordinatesFromUrl(url) {
  try {
    let lat, lng;
    
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }
    
    if (!lat || !lng) {
      const placeMatch = url.match(/place\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }
    
    // Format 3: https://maps.google.com/maps?q=lat,lng
    if (!lat || !lng) {
      const queryMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (queryMatch) {
        lat = parseFloat(queryMatch[1]);
        lng = parseFloat(queryMatch[2]);
      }
    }
    
    // Format 4: https://www.google.com/maps/search/query/@lat,lng,zoom
    if (!lat || !lng) {
      const searchMatch = url.match(/search\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (searchMatch) {
        lat = parseFloat(searchMatch[1]);
        lng = parseFloat(searchMatch[2]);
      }
    }
    
    // Format 5: https://www.google.com/maps/place/lat,lng/... (new format from short links)
    if (!lat || !lng) {
      const placeMatch = url.match(/place\/(\d+\.?\d*),(\d+\.?\d*)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }
    
    // Validate coordinates
    if (lat && lng && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

module.exports = {
  resolveGoogleMapsShortLink,
  extractCoordinatesFromUrl
};
