// Enhanced game initialization with centralized navigation logic
document.addEventListener('DOMContentLoaded', function() {
    // Centralized Navigation Manager - Define this FIRST before anything else
    window.GameNavigationManager = {
      // Save current scene to localStorage
      saveScene: function(sceneKey, additionalData = {}) {
        try {
          const sceneData = {
            sceneKey: sceneKey,
            timestamp: Date.now(),
            ...additionalData
          };
          localStorage.setItem('reflectionGameScene', JSON.stringify(sceneData));
          console.log('Scene saved:', sceneKey);
        } catch (e) {
          console.warn('Could not save scene state:', e);
        }
      },
      
      // Get current scene from localStorage
      getCurrentScene: function() {
        try {
          const savedState = localStorage.getItem('reflectionGameScene');
          if (savedState) {
            return JSON.parse(savedState);
          }
        } catch (e) {
          console.warn('Could not load scene state:', e);
        }
        return null;
      },
      
      // Navigate to a new scene
      navigateTo: function(game, targetScene, fadeOut = true) {
        console.log('Navigating to:', targetScene);
        
        // Save the target scene immediately
        this.saveScene(targetScene);
        
        // Get current scene
        const currentScene = game.scene.getScenes(true)[0];
        
        if (fadeOut && currentScene && currentScene.cameras) {
          // Smooth transition
          currentScene.cameras.main.fadeOut(400, 250, 250, 250);
          currentScene.cameras.main.once('camerafadeoutcomplete', () => {
            currentScene.scene.start(targetScene);
          });
        } else {
          // Direct transition
          if (currentScene) {
            currentScene.scene.start(targetScene);
          }
        }
      },
      
      // Handle scene started event
      onSceneStarted: function(sceneKey) {
        this.saveScene(sceneKey);
      }
    };

    // Initialize game with enhanced error handling
    initializeGame();
    
    function initializeGame() {
      try {
        console.log('Initializing Reflection Game...');
        
        // Pre-initialization setup
        setupPreGameEnvironment();
        
        // Get the correct initial scene from localStorage
        const initialScene = getInitialSceneFromStorage();
        
        // Update config with the correct initial scene
        updateConfigForInitialScene(initialScene);
        
        // Create the Phaser game instance
        const game = new Phaser.Game(config);
        
        // Post-initialization setup
        setupPostGameEnvironment(game);
        
        console.log('Game initialization complete');
        
      } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorMessage('Failed to load game. Please refresh the page.');
      }
    }
    
    function getInitialSceneFromStorage() {
      const savedScene = window.GameNavigationManager.getCurrentScene();
      
      if (savedScene && savedScene.sceneKey) {
        console.log('Found saved scene:', savedScene.sceneKey);
        return savedScene.sceneKey;
      }
      
      console.log('No saved scene found, defaulting to MenuScene');
      return 'MenuScene';
    }
    
    function updateConfigForInitialScene(initialScene) {
      // Find the scene in the config and move it to the front
      const sceneIndex = config.scene.findIndex(scene => {
        if (typeof scene === 'string') {
          return scene === initialScene;
        } else if (scene.key) {
          return scene.key === initialScene;
        } else {
          // For class constructors, check the key property
          try {
            const tempInstance = new scene();
            return tempInstance.scene.key === initialScene;
          } catch (e) {
            return false;
          }
        }
      });
      
      if (sceneIndex > 0) {
        // Move the initial scene to the front
        const targetScene = config.scene.splice(sceneIndex, 1)[0];
        config.scene.unshift(targetScene);
        console.log('Updated initial scene to:', initialScene);
      }
    }
    
    function setupPreGameEnvironment() {
      // Font loading optimization
      loadFonts();
      
      // Mobile-specific setup
      setupMobileEnvironment();
      
      // Performance monitoring setup
      setupPerformanceMonitoring();
      
      // Accessibility setup
      setupAccessibility();
      
      // Progressive Web App setup
      setupPWA();
    }
    
    function loadFonts() {
      // Load Inter font for better performance
      if ('fonts' in document) {
        const interFont = new FontFace('Inter', 'url(https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap)');
        
        document.fonts.add(interFont);
        
        interFont.load().then(() => {
          console.log('Inter font loaded successfully');
        }).catch((error) => {
          console.warn('Failed to load Inter font:', error);
        });
      }
    }
    
    function setupMobileEnvironment() {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Prevent zoom on mobile
        preventMobileZoom();
        
        // Setup mobile orientation handling
        setupOrientationHandling();
        
        // Setup mobile wake lock (if supported)
        setupWakeLock();
        
        // Mobile-specific viewport handling
        setupMobileViewport();
      }
    }
    
    function preventMobileZoom() {
      // Prevent pinch zoom
      document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
      }, { passive: false });
      
      // Prevent double-tap zoom
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, { passive: false });
      
      // Prevent scroll
      document.addEventListener('touchmove', function(e) {
        e.preventDefault();
      }, { passive: false });
    }
    
    function setupOrientationHandling() {
      const orientationMessage = document.getElementById('orientation-message');
      
      function checkOrientation() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Force landscape orientation if supported
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
              console.log('Orientation lock not supported:', err);
            });
          }
          
          // Show/hide orientation message based on current orientation
          if (window.innerWidth < window.innerHeight) {
            // Portrait mode
            if (orientationMessage) {
              orientationMessage.style.display = 'flex';
            }
            document.getElementById('game-container').style.display = 'none';
          } else {
            // Landscape mode
            if (orientationMessage) {
              orientationMessage.style.display = 'none';
            }
            document.getElementById('game-container').style.display = 'flex';
          }
          
          // Request fullscreen on first interaction in landscape
          const requestFullscreen = () => {
            if (window.innerWidth >= window.innerHeight) {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                  console.log('Fullscreen not supported:', err);
                });
              } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
              }
            }
          };
          
          document.addEventListener('touchstart', requestFullscreen, { once: true });
          document.addEventListener('click', requestFullscreen, { once: true });
        }
      }
      
      // Check orientation on load and changes
      checkOrientation();
      window.addEventListener('orientationchange', () => {
        setTimeout(checkOrientation, 100); // Small delay for orientation change
      });
      window.addEventListener('resize', checkOrientation);
    }
    
    function setupWakeLock() {
      // Keep screen awake during gameplay (if supported)
      if ('wakeLock' in navigator) {
        let wakeLock = null;
        
        const requestWakeLock = async () => {
          try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock acquired');
          } catch (err) {
            console.log('Wake lock failed:', err);
          }
        };
        
        const releaseWakeLock = () => {
          if (wakeLock) {
            wakeLock.release();
            wakeLock = null;
            console.log('Wake lock released');
          }
        };
        
        // Request wake lock when game starts
        document.addEventListener('gamestart', requestWakeLock);
        document.addEventListener('gamestop', releaseWakeLock);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            releaseWakeLock();
          }
        });
      }
    }
    
    function setupMobileViewport() {
      // iOS viewport height fix
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
      });
    }
    
    function setupPerformanceMonitoring() {
      // Performance monitoring
      let performanceWarningShown = false;
      
      const checkPerformance = () => {
        if ('memory' in performance && !performanceWarningShown) {
          const memory = performance.memory;
          const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          
          if (memoryUsage > 0.8) {
            console.warn('High memory usage detected:', memoryUsage);
            performanceWarningShown = true;
          }
        }
      };
      
      // Check performance every 30 seconds
      setInterval(checkPerformance, 30000);
      
      // Monitor FPS
      let fpsCounter = 0;
      let lastFpsCheck = performance.now();
      
      const monitorFPS = () => {
        fpsCounter++;
        const now = performance.now();
        
        if (now - lastFpsCheck >= 1000) {
          const fps = Math.round((fpsCounter * 1000) / (now - lastFpsCheck));
          
          if (fps < 30) {
            console.warn('Low FPS detected:', fps);
            // Could trigger performance mode
          }
          
          fpsCounter = 0;
          lastFpsCheck = now;
        }
        
        requestAnimationFrame(monitorFPS);
      };
      
      requestAnimationFrame(monitorFPS);
    }
    
    function setupAccessibility() {
      // Reduced motion detection
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      if (prefersReducedMotion.matches) {
        document.body.classList.add('reduced-motion');
        console.log('Reduced motion mode enabled');
      }
      
      prefersReducedMotion.addListener((e) => {
        if (e.matches) {
          document.body.classList.add('reduced-motion');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
      
      // High contrast detection
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      
      if (prefersHighContrast.matches) {
        document.body.classList.add('high-contrast');
        console.log('High contrast mode enabled');
      }
      
      prefersHighContrast.addListener((e) => {
        if (e.matches) {
          document.body.classList.add('high-contrast');
        } else {
          document.body.classList.remove('high-contrast');
        }
      });
      
      // Keyboard navigation support
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          document.body.classList.add('keyboard-navigation');
        }
      });
      
      document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
      });
    }
    
    function setupPWA() {
      // Service Worker registration (if available)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('Service Worker registered:', registration);
        }).catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
      }
      
      // App install prompt
      let deferredPrompt;
      
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Could show custom install button
        console.log('App install prompt available');
      });
      
      window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
      });
    }
    
    function setupPostGameEnvironment(game) {
      // Expose game to window for debugging
      if (typeof window !== 'undefined') {
        window.game = game;
        window.gameConfig = config;
        
        // Debug helpers
        window.gameDebug = {
          getPerformanceInfo: () => {
            return {
              fps: game.loop.actualFps,
              memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
              } : 'Not available'
            };
          },
          
          toggleDebug: () => {
            const currentScene = game.scene.getScenes(true)[0];
            if (currentScene && currentScene.matter) {
              currentScene.matter.world.debugGraphic.visible = !currentScene.matter.world.debugGraphic.visible;
            }
          }
        };
      }
      
      // Simple and bulletproof resize handling with page reload
      let resizeTimeout;
      let isResizing = false;
      let resizeIndicator = null;
      let originalSize = { width: window.innerWidth, height: window.innerHeight };
      
      const showResizeIndicator = () => {
        if (!resizeIndicator) {
          resizeIndicator = document.createElement('div');
          resizeIndicator.innerHTML = `
            <div style="
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(250, 250, 250, 0.98);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              font-family: 'Inter', sans-serif;
              color: #1a1a1a;
              z-index: 10000;
            ">
              <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
                Screen size changed
              </div>
              <div style="font-size: 16px; color: #6c757d; margin-bottom: 24px;">
                Refreshing for optimal display...
              </div>
              <div style="
                width: 32px;
                height: 32px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #1a1a1a;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              "></div>
            </div>
          `;
          document.body.appendChild(resizeIndicator);
        }
      };
      
      const handleResize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // Check if this is a significant resize
        const widthChange = Math.abs(newWidth - originalSize.width) / originalSize.width;
        const heightChange = Math.abs(newHeight - originalSize.height) / originalSize.height;
        
        // Only trigger refresh for significant changes (> 15%)
        if (widthChange > 0.15 || heightChange > 0.15) {
          if (!isResizing) {
            isResizing = true;
            showResizeIndicator();
            
            // Save current scene state before reload
            const currentScene = game.scene.getScenes(true)[0];
            if (currentScene) {
              window.GameNavigationManager.saveScene(currentScene.scene.key);
            }
          }
          
          // Clear existing timeout
          clearTimeout(resizeTimeout);
          
          // Wait for resize to stop, then reload page
          resizeTimeout = setTimeout(() => {
            console.log('Significant resize detected, refreshing page for optimal display');
            window.location.reload();
          }, 800); // Wait 800ms after resize stops
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Handle visibility changes for pause/resume
      document.addEventListener('visibilitychange', () => {
        const currentScene = game.scene.getScenes(true)[0];
        
        if (document.hidden) {
          // Pause game when tab/window is not visible
          if (currentScene && currentScene.scene.key !== 'MenuScene') {
            currentScene.scene.pause();
          }
        } else {
          // Resume game when tab/window becomes visible
          if (currentScene && currentScene.scene.isPaused()) {
            currentScene.scene.resume();
          }
        }
      });
      
      // Global error handling for the game
      game.events.on('error', (error) => {
        console.error('Game error:', error);
        showErrorMessage('A game error occurred. Please refresh the page.');
      });
      
      // Enhanced error recovery
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        
        // Attempt recovery for resize-related errors
        if (event.error.message && event.error.message.includes('resize')) {
          console.log('Attempting resize error recovery...');
          setTimeout(() => {
            try {
              game.scale.refresh();
            } catch (e) {
              console.error('Recovery failed:', e);
            }
          }, 100);
        }
      });
      
      // Memory cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        if (game) {
          game.destroy(true, false);
        }
      });
      
      // Set up scene tracking - save scene whenever it changes
      game.events.on('step', () => {
        const currentScene = game.scene.getScenes(true)[0];
        if (currentScene && currentScene.scene.key) {
          // Check if scene has changed
          const lastScene = window.GameNavigationManager.getCurrentScene();
          if (!lastScene || lastScene.sceneKey !== currentScene.scene.key) {
            window.GameNavigationManager.onSceneStarted(currentScene.scene.key);
          }
        }
      });
      
      // Override scene transitions in all scenes to use centralized navigation
      game.scene.scenes.forEach(scene => {
        const originalStart = scene.scene.start.bind(scene.scene);
        
        scene.scene.start = function(key, data) {
          window.GameNavigationManager.saveScene(key);
          return originalStart(key, data);
        };
      });
    }
    
    function showErrorMessage(message) {
      // Create error overlay
      const errorOverlay = document.createElement('div');
      errorOverlay.id = 'error-overlay';
      errorOverlay.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: Inter, system-ui, sans-serif;
          color: #1a1a1a;
          z-index: 10000;
        ">
          <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
            Something went wrong
          </h2>
          <p style="font-size: 16px; color: #6c757d; margin-bottom: 24px; text-align: center; max-width: 400px;">
            ${message}
          </p>
          <button onclick="window.location.reload()" style="
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
          ">
            Refresh Page
          </button>
        </div>
      `;
      
      document.body.appendChild(errorOverlay);
    }
  });