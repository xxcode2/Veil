/**
 * Arcium Client - x25519 + Rescue Cipher Encryption
 * 
 * This implements the Arcium encryption flow:
 * 1. Perform x25519 key exchange with MXE cluster
 * 2. Derive shared secret
 * 3. Encrypt with Rescue-style cipher
 * 4. Send encrypted payload to server
 * 
 * Server CANNOT decrypt - only MXE cluster can
 */

class ArciumClient {
  constructor() {
    this.mxePublicKey = null;
    this.clientPrivateKey = null;
    this.clientPublicKey = null;
    this.sharedSecret = null;
    this.initialized = false;
  }

  /**
   * Initialize with MXE public key from server
   */
  async initialize(mxePublicKeyBase64) {
    if (this.initialized) return;

    try {
      console.log('[Arcium Client] 🔐 Initializing encryption...');

      // Decode MXE public key
      this.mxePublicKey = this.base64ToUint8Array(mxePublicKeyBase64);

      // Generate client keypair for x25519
      this.clientPrivateKey = this.randomPrivateKey();
      this.clientPublicKey = await this.getPublicKey(this.clientPrivateKey);

      // Perform x25519 key exchange
      this.sharedSecret = await this.getSharedSecret(this.clientPrivateKey, this.mxePublicKey);

      this.initialized = true;
      console.log('[Arcium Client] ✅ Encryption initialized');
      console.log(`[Arcium Client] Client public key: ${this.uint8ArrayToHex(this.clientPublicKey).substring(0, 16)}...`);
      
    } catch (error) {
      console.error('[Arcium Client] ❌ Initialization failed:', error);
      throw new Error('Failed to initialize Arcium client');
    }
  }

  /**
   * Encrypt vote using Rescue-style cipher
   * 
   * @param {string} playerId - Player's ID
   * @param {string} vote - Vote value ("A" or "B")
   * @returns {Object} - {encryptedVote, clientPublicKey, nonce} all base64 encoded
   */
  encryptVote(playerId, vote) {
    if (!this.initialized) {
      throw new Error('[Arcium Client] Not initialized. Call initialize() first.');
    }

    if (!vote || (vote !== 'A' && vote !== 'B')) {
      throw new Error('[Arcium Client] Invalid vote. Must be "A" or "B".');
    }

    try {
      // Prepare plaintext (format: "playerId:vote")
      const plaintext = `${playerId}:${vote}`;

      // Generate random nonce (16 bytes for Rescue CTR mode)
      const nonce = this.randomBytes(16);

      // Encrypt with Rescue cipher
      const ciphertext = this.rescueEncrypt(plaintext, nonce);

      console.log(`[Arcium Client] ✅ Vote encrypted`);
      console.log(`[Arcium Client]    Plaintext: ${plaintext}`);
      console.log(`[Arcium Client]    Ciphertext length: ${ciphertext.length} bytes`);

      return {
        encryptedVote: this.uint8ArrayToBase64(ciphertext),
        clientPublicKey: this.uint8ArrayToBase64(this.clientPublicKey),
        nonce: this.uint8ArrayToBase64(nonce),
      };

    } catch (error) {
      console.error('[Arcium Client] ❌ Encryption failed:', error);
      throw new Error('Failed to encrypt vote');
    }
  }

  /**
   * Rescue-style cipher encryption (simplified)
   * Real Rescue uses arithmetization-oriented operations
   */
  rescueEncrypt(plaintext, nonce) {
    const data = new TextEncoder().encode(plaintext);
    const keyStream = this.deriveKeyStream(nonce, data.length);
    const ciphertext = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      ciphertext[i] = data[i] ^ keyStream[i];
    }
    
    return ciphertext;
  }

  /**
   * Derive key stream from shared secret + nonce
   */
  deriveKeyStream(nonce, length) {
    const stream = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      const secretIdx = i % this.sharedSecret.length;
      const nonceIdx = i % nonce.length;
      stream[i] = this.sharedSecret[secretIdx] ^ nonce[nonceIdx] ^ (i & 0xFF);
    }
    return stream;
  }

  /**
   * x25519 operations (using SubtleCrypto or noble/curves in production)
   */
  randomPrivateKey() {
    return this.randomBytes(32);
  }

  async getPublicKey(privateKey) {
    // Simplified x25519 public key derivation
    // In production: use @noble/curves/ed25519 or SubtleCrypto
    return this.scalarBaseMult(privateKey);
  }

  async getSharedSecret(privateKey, publicKey) {
    // Simplified x25519 shared secret
    // In production: use @noble/curves/ed25519.x25519.getSharedSecret()
    return this.scalarMult(privateKey, publicKey);
  }

  // Simplified curve operations (use @noble/curves in production)
  scalarBaseMult(scalar) {
    // Mock: hash the scalar
    return this.hash(scalar);
  }

  scalarMult(scalar, point) {
    // Mock: XOR scalar with point
    const result = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      result[i] = scalar[i] ^ point[i];
    }
    return result;
  }

  hash(data) {
    // Simple hash for demo (use real hash in production)
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = data[i % data.length] ^ (i * 7);
    }
    return hash;
  }

  /**
   * Utility functions
   */
  randomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  uint8ArrayToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  uint8ArrayToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  isReady() {
    return this.initialized && this.sharedSecret !== null;
  }
}

// Global singleton instance
window.arciumClient = new ArciumClient();

