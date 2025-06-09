import CryptoJS from 'crypto-js'
import { config } from '../config'

export function encryption(encryptext: string): string {
  const secretKey = config.aes.secret
  
  if (!secretKey) {
    throw new Error('AES_SECRET_KEY is not defined in environment variables');
  }
  
  const encrypted = CryptoJS.AES.encrypt(encryptext, secretKey).toString();
  return encrypted;
}

export function decryption(decryptext: string): string {
  const secretKey = config.aes.secret
  
  if (!secretKey) {
    throw new Error('AES_SECRET_KEY is not defined in environment variables');
  }
  
  const decrypted = CryptoJS.AES.decrypt(decryptext, secretKey).toString(CryptoJS.enc.Utf8);
  return decrypted;
}