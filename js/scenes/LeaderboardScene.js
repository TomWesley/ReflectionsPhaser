class LeaderboardScene extends Phaser.Scene {
    constructor() {
      super({ key: 'LeaderboardScene' });
      
      // Default values
      this.scores = [];
      this.isLoading = true;
      this.errorMessage = null;
    }
    
    create() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Create background
      this.add.rectangle(0, 0, width, height, 0x000033).setOrigin(0);
      
      // Create header text
      this.add.text(width / 2, 60, 'LEADERBOARD', {
        fontFamily: 'Arial',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5);
      
      // Create subtitle
      this.add.text(width / 2, 110, 'Fastest completion times', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#aaaaff'
      }).setOrigin(0.5);
      
      // Loading text
      this.loadingText = this.add.text(width / 2, height / 2, 'Loading scores...', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Create container for score items
      this.scoresContainer = this.add.container(width / 2, 180);
      
      // Create back button
      const backButton = this.add.rectangle(width / 2, height - 60, 200, 50, 0x444477, 0.8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.backToMenu())
        .on('pointerover', () => backButton.fillColor = 0x5555aa)
        .on('pointerout', () => backButton.fillColor = 0x444477);
      
      const backText = this.add.text(width / 2, height - 60, 'BACK TO MENU', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Load scores from Firebase
      this.loadScores();
    }
    
    loadScores() {
      // Load the top 10 scores from Firebase
      getTopScores(10)
        .then(scores => {
          this.scores = scores;
          this.isLoading = false;
          this.displayScores();
        })
        .catch(error => {
          console.error("Error loading scores:", error);
          this.isLoading = false;
          this.errorMessage = "Error loading scores. Please try again.";
          this.displayScores();
        });
    }
    
    displayScores() {
      // Clear loading text
      this.loadingText.destroy();
      
      // Clear previous scores
      this.scoresContainer.removeAll();
      
      // If there was an error, display error message
      if (this.errorMessage) {
        const errorText = this.add.text(0, 0, this.errorMessage, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ff5555'
        }).setOrigin(0.5);
        
        this.scoresContainer.add(errorText);
        return;
      }
      
      // If no scores, show message
      if (this.scores.length === 0) {
        const noScoresText = this.add.text(0, 0, 'No scores yet. Be the first!', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff'
        }).setOrigin(0.5);
        
        this.scoresContainer.add(noScoresText);
        return;
      }
      
      // Create table header
      const headerBg = this.add.rectangle(0, -40, 500, 40, 0x333366);
      const rankHeader = this.add.text(-220, -40, 'RANK', {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      const nameHeader = this.add.text(-150, -40, 'NAME', {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      const scoreHeader = this.add.text(100, -40, 'TIME', {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      this.scoresContainer.add([headerBg, rankHeader, nameHeader, scoreHeader]);
      
      // Add scores to container
      this.scores.forEach((score, index) => {
        const y = index * 40;
        
        // Background for row (alternating colors)
        const rowBg = this.add.rectangle(0, y, 500, 40, index % 2 === 0 ? 0x222244 : 0x111133);
        
        // Rank number
        const rankText = this.add.text(-220, y, `${index + 1}.`, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: index < 3 ? '#ffdd44' : '#ffffff' // Gold color for top 3
        }).setOrigin(0, 0.5);
        
        // Player name (truncate if too long)
        let displayName = score.name || 'Anonymous';
        if (displayName.length > 20) {
          displayName = displayName.substring(0, 17) + '...';
        }
        
        const nameText = this.add.text(-150, y, displayName, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // Score (time)
        const scoreText = this.add.text(100, y, `${score.score.toFixed(3)}s`, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: index < 3 ? '#ffdd44' : '#ffffff' // Gold color for top 3
        }).setOrigin(0, 0.5);
        
        // Add elements to container
        this.scoresContainer.add([rowBg, rankText, nameText, scoreText]);
        
        // If score has timestamp, add date
        if (score.timestamp) {
          let date = '';
          
          // Format timestamp
          if (score.timestamp instanceof Date) {
            date = score.timestamp.toLocaleDateString();
          } else if (score.timestamp.toDate) {
            // Firestore timestamp
            date = score.timestamp.toDate().toLocaleDateString();
          }
          
          if (date) {
            const dateText = this.add.text(220, y, date, {
              fontFamily: 'Arial',
              fontSize: '14px',
              color: '#aaaaaa'
            }).setOrigin(0, 0.5);
            
            this.scoresContainer.add(dateText);
          }
        }
      });
      
      // Add decorative elements
      this.addDecorativeElements();
    }
    
    addDecorativeElements() {
      // Add some decoration elements to the leaderboard
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Trophy icon for top score
      if (this.scores.length > 0) {
        const trophy = this.add.text(-260, 0, '🏆', {
          fontSize: '28px'
        }).setOrigin(0.5);
        
        this.scoresContainer.add(trophy);
        
        // Add animation to trophy
        this.tweens.add({
          targets: trophy,
          y: '-=5',
          duration: 1000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      }
      
      // Add some mirror decoration elements
      for (let i = 0; i < 2; i++) {
        const x = (i === 0) ? width * 0.15 : width * 0.85;
        const mirror = this.add.image(x, height * 0.5, `mirror${Phaser.Math.Between(1, 4)}`)
          .setScale(0.3)
          .setAlpha(0.2)
          .setRotation(Phaser.Math.Between(0, 360) * Math.PI / 180);
        
        // Add subtle rotation animation
        this.tweens.add({
          targets: mirror,
          rotation: mirror.rotation + Math.PI * 2,
          duration: Phaser.Math.Between(20000, 30000),
          repeat: -1
        });
      }
    }
    
    backToMenu() {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    }
  }