// Enhanced game configuration for modern devices and scaling
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#fafafa', // NYT-style background
    
    // Enhanced physics configuration
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: 0 }, // No gravity for laser reflection game
        debug: false, // Debug mode off for production
        
        // Enhanced Matter.js settings for better performance
        timing: {
          timeScale: 1,
          timestamp: 0
        },
        
        // Better collision detection
        enableSleeping: false, // Keep everything active for laser physics
        positionIterations: 6, // Higher precision for collisions
        velocityIterations: 4,
        constraintIterations: 2,
        
        // Performance optimizations
        broadphase: {
          type: 'grid' // Grid broadphase for better performance with many objects
        }
      }
    },
    
    // Enhanced scaling configuration for all devices
    scale: {
      mode: Phaser.Scale.RESIZE, // Dynamic resize
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: 'game-container',
      width: '100%',
      height: '100%',
      
      // Better handling of different screen sizes
      min: {
        width: 320,  // Minimum width for very small devices
        height: 240  // Minimum height
      },
      max: {
        width: 3840, // Support for 4K displays
        height: 2160
      },
      
      // Zoom settings for very high-density displays
      zoom: 1,
      
      // Better orientation handling
      fullscreenTarget: 'game-container'
    },
    
    // Scene configuration
    scene: [
      MenuScene,
      GameScene,
      LeaderboardScene
    ],
    
    // Enhanced input configuration
    input: {
      activePointers: 1, // Single pointer for simplicity
      smoothFactor: 0.2, // Smooth pointer movement
      
      // Better touch handling
      touch: {
        capture: true
      },
      
      // Mouse configuration
      mouse: {
        preventDefaultWheel: false, // Allow page scrolling when needed
        preventDefaultMove: false,
        preventDefaultDown: false,
        preventDefaultUp: false
      },
      
      // Gamepad support (if needed in future)
      gamepad: false
    },
    
    // Enhanced rendering configuration
    render: {
      antialias: true,        // Smooth edges
      pixelArt: false,        // Vector graphics, not pixel art
      roundPixels: false,     // Allow sub-pixel rendering for smooth movement
      transparent: false,     // Opaque background
      clearBeforeRender: true,
      premultipliedAlpha: true,
      failIfMajorPerformanceCaveat: false,
      
      // Better batching for performance
      batchSize: 4096,
      maxLights: 10,
      
      // WebGL configuration
      powerPreference: 'default', // Let browser choose
      mipmapFilter: 'LINEAR',
      
      // Canvas fallback configuration
      canvasStyle: 'margin: 0; padding: 0;'
    },
    
    // Audio configuration
    audio: {
      disableWebAudio: false,
      noAudio: false,
      volume: 0.7
    },
    
    // Enhanced loader configuration
    loader: {
      baseURL: '',
      path: '',
      maxParallelDownloads: 6,
      crossOrigin: 'anonymous',
      responseType: '',
      async: true,
      user: '',
      password: '',
      timeout: 30000, // 30 second timeout
      withCredentials: false
    },
    
    // Plugin configuration
    plugins: {
      global: [],
      scene: []
    },
    
    // Performance and debugging
    fps: {
      min: 30,      // Minimum acceptable FPS
      target: 60,   // Target FPS
      forceSetTimeOut: false,
      deltaHistory: 10,
      panicMax: 120,
      smoothStep: true
    },
    
    // DOM configuration
    dom: {
      createContainer: false,
      behindCanvas: false
    },
    
    // Banner configuration (Phaser version info)
    banner: {
      hidePhaser: false,
      text: '#ffffff',
      background: [
        '#ff0000',
        '#ffff00',
        '#00ff00',
        '#00ffff',
        '#000000'
      ]
    },
    
    // Custom game-specific configuration
    gameConfig: {
      // NYT-style design tokens
      design: {
        colors: {
          background: '#fafafa',
          surface: '#ffffff',
          primary: '#1a1a1a',
          secondary: '#6c757d',
          accent: '#121212',
          success: '#4ade80',
          error: '#ef4444',
          warning: '#f59e0b',
          border: '#e5e7eb'
        },
        
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          mono: 'JetBrains Mono, Consolas, monospace'
        },
        
        animations: {
          duration: {
            fast: 150,
            normal: 300,
            slow: 600
          },
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      },
      
      // Game mechanics
      gameplay: {
        timeLimit: {
          desktop: 75,
          mobile: 90
        },
        
        mirrors: {
          count: {
            desktop: 9,
            mobile: 7
          },
          minSpacing: 50
        },
        
        spawners: {
          count: 4,
          laserSpeed: .001
        }
      },
      
      // Performance settings
      performance: {
        maxParticles: 100,
        trailLength: 50,
        updateRate: 60,
        lowPerformanceThreshold: 30
      },
      
      // Accessibility
      accessibility: {
        reducedMotion: false, // Will be detected at runtime
        highContrast: false,
        fontSize: 'normal'
      }
    },
    
    // Prevent context menu on long press/right click
    disableContextMenu: true,
    
    // Better error handling
    callbacks: {
      preBoot: function (game) {
        // Pre-boot initialization
        console.log('Reflection Game initializing...');
        
        // Detect reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          game.config.gameConfig.accessibility.reducedMotion = true;
        }
        
        // Detect high contrast preference
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
          game.config.gameConfig.accessibility.highContrast = true;
        }
      },
      
      postBoot: function (game) {
        // Post-boot initialization
        console.log('Reflection Game initialized successfully');
        
        // Set up global error handling
        window.addEventListener('error', (event) => {
          console.error('Game error:', event.error);
          // Could send to analytics or error reporting service
        });
        
        // Set up unhandled promise rejection handling
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason);
        });
      }
    }
  };
  
  // Device-specific optimizations
  (function() {
    // Mobile optimizations
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Reduce some settings for mobile performance
      config.physics.matter.positionIterations = 4;
      config.physics.matter.velocityIterations = 3;
      config.render.batchSize = 2048;
      config.gameConfig.performance.maxParticles = 50;
      config.gameConfig.performance.trailLength = 30;
    }
    
    // High DPI display optimizations
    const pixelRatio = window.devicePixelRatio || 1;
    if (pixelRatio > 2) {
      // Ultra high DPI - optimize for performance
      config.render.antialias = false; // Disable on very high DPI displays
      config.gameConfig.performance.updateRate = 30; // Lower update rate
    }
    
    // Low-end device detection and optimization
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        // Detect integrated graphics or low-end GPUs
        if (renderer.includes('Intel') && !renderer.includes('Iris')) {
          // Reduce settings for integrated graphics
          config.gameConfig.performance.maxParticles = 25;
          config.render.batchSize = 1024;
          config.physics.matter.positionIterations = 3;
        }
      }
    }
    
    // Memory-constrained device optimizations
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      // Reduce memory usage for low-memory devices
      config.gameConfig.performance.trailLength = 20;
      config.gameConfig.performance.maxParticles = 30;
      config.loader.maxParallelDownloads = 3;
    }
  })();