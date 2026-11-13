// src/services/tool.service.js
import User from "../models/user.model.js";
export const publicTools = [
  {
    type: "function",
    function: {
      name: "getGithubStats",
      description: "Fetch live public GitHub metrics including repository count and total stars for a given username.",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "github username is hassan42772",
          },
        },
        required: [],
      },
    },
  },
  // NEW WEATHER TOOL ADDED HERE
  {
    type: "function",
    function: {
      name: "getWeather",
      description: "Fetch the current weather data. Defaults to Hassan's current city, Lahore.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The name of the city to get weather for (e.g., 'Lahore').",
          },
        },
        required: [],
      },
    },
  }
];

export const adminTools = [
  {
    type: "function",
    function: {
      name: "getSystemStatus",
      description: "Fetch the current backend server status, uptime, and memory usage. For admin use only.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getAllUsers",
      description: "Fetch a list of all registered users. For admin use only.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  }
];

// NEW HELPER: Dynamically construct the allowed tools array based on role
export const getToolsByRole = (role) => {
  if (role === "admin") {
    return [...publicTools, ...adminTools];
  }
  return publicTools; // Standard users only get safe, read-only tools
};



export const executeTool = async (toolCall) => {
  const { name, arguments: args } = toolCall.function;
  
  // Helper to safely parse arguments
  let parsedArgs = {};
  if (args) {
    try {
      parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    } catch (e) {
      console.error(`Failed to parse args for ${name}:`, e);
    }
  }

  // ==========================================
  // TOOL 1: GitHub Stats
  // ==========================================
  if (name === "getGithubStats") {
    try {
      const username = parsedArgs.username || "hassan42772";  

      const userRes = await fetch(`https://api.github.com/users/${username}`, {
        headers: { "User-Agent": "MERN-RAG-Chatbot" },
      });

      if (!userRes.ok) return JSON.stringify({ error: `Could not fetch stats for user: ${username}` });

      const userData = await userRes.json();

      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers: { "User-Agent": "MERN-RAG-Chatbot" },
      });

      let totalStars = 0;
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        totalStars = reposData.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
      }

      return JSON.stringify({
        username: userData.login,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        totalStars,
        profileUrl: userData.html_url,
      });
    } catch (error) {
      console.error("Tool execution error (getGithubStats):", error);
      return JSON.stringify({ error: "Failed to retrieve live GitHub stats." });
    }
  }

  // ==========================================
  // TOOL 2: Live Weather Data
  // ==========================================
  if (name === "getWeather") {
    try {
      const city = (parsedArgs.city || "Lahore").toLowerCase();

      // Open-Meteo requires coordinates. We default to Lahore.
      let lat = 31.5204;
      let lon = 74.3587; 

      // Simple routing for a few other cities if the AI requests them
      if (city === "karachi") { lat = 24.8607; lon = 67.0011; }
      else if (city === "islamabad") { lat = 33.6844; lon = 73.0479; }

      // Fetch from Open-Meteo free API
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);

      if (!weatherRes.ok) {
        return JSON.stringify({ error: `Could not fetch weather for city: ${city}` });
      }

      const weatherData = await weatherRes.json();
      const current = weatherData.current_weather;

      return JSON.stringify({
        city: city.charAt(0).toUpperCase() + city.slice(1),
        temperature_celsius: current.temperature,
        windspeed_kmh: current.windspeed,
        is_day: current.is_day === 1 ? "Yes" : "No",
        timestamp: current.time
      });
    } catch (error) {
      console.error("Tool execution error (getWeather):", error);
      return JSON.stringify({ error: "Failed to retrieve live weather data." });
    }
  }
  // ==========================================
  // TOOL 3: System Status (Admin Only)
  // ==========================================
  if (name === "getSystemStatus") {
    try {
      // Simulate fetching server metrics
      const systemMetrics = {
        status: "Healthy",
        uptime: "14 days, 3 hours",
        cpuLoad: "12%",
        memoryUsage: "456MB / 1024MB",
        activeDatabaseConnections: 4,
        securityMessage: "Admin clearance verified."
      };

      return JSON.stringify(systemMetrics);
    } catch (error) {
      console.error("Tool execution error (getSystemStatus):", error);
      return JSON.stringify({ error: "Failed to retrieve system status." });
    }
  }
  if(name === "getAllUsers") {
    try {
    // .find({}) gets all users. '-password' ensures we don't accidentally leak hashes to the AI.
    // .lean() makes the query faster by returning plain JavaScript objects instead of Mongoose documents.
    const users = await User.find({}, "-password").lean();
    
    if (!users || users.length === 0) {
      return JSON.stringify({ message: "No users found in the database." });
    }
    
    return JSON.stringify(users);
  } catch (error) {
    console.error("Database Error in getAllUsers tool:", error);
    return JSON.stringify({ error: "Failed to fetch users due to a database error." });
  }
  }
  return JSON.stringify({ error: `Tool ${name} not found` });
};