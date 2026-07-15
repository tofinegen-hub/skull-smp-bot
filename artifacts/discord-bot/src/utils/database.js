/**
 * Skull SMP — JSON File Database
 * Simple key-value store backed by JSON files in ./data/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(table) {
  return join(DATA_DIR, `${table}.json`);
}

function readTable(table) {
  const fp = filePath(table);
  if (!existsSync(fp)) return {};
  try {
    return JSON.parse(readFileSync(fp, 'utf8'));
  } catch {
    return {};
  }
}

function writeTable(table, data) {
  try {
    writeFileSync(filePath(table), JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.error(`DB write error (${table}):`, err);
  }
}

const db = {
  // ─── Generic ─────────────────────────────────────────────────────────────
  get(table, key) {
    const data = readTable(table);
    return key ? data[key] : data;
  },

  set(table, key, value) {
    const data = readTable(table);
    data[key] = value;
    writeTable(table, data);
    return value;
  },

  delete(table, key) {
    const data = readTable(table);
    delete data[key];
    writeTable(table, data);
  },

  has(table, key) {
    const data = readTable(table);
    return key in data;
  },

  // ─── Warns ───────────────────────────────────────────────────────────────
  addWarn(guildId, userId, warn) {
    const key = `${guildId}_${userId}`;
    const data = readTable('warns');
    if (!data[key]) data[key] = [];
    data[key].push({ ...warn, id: Date.now(), date: new Date().toISOString() });
    writeTable('warns', data);
    return data[key];
  },

  getWarns(guildId, userId) {
    const key = `${guildId}_${userId}`;
    return readTable('warns')[key] || [];
  },

  clearWarns(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const data = readTable('warns');
    delete data[key];
    writeTable('warns', data);
  },

  removeWarn(guildId, userId, warnId) {
    const key = `${guildId}_${userId}`;
    const data = readTable('warns');
    if (!data[key]) return false;
    const before = data[key].length;
    data[key] = data[key].filter((w) => w.id !== Number(warnId));
    writeTable('warns', data);
    return data[key].length < before;
  },

  // ─── Mutes ───────────────────────────────────────────────────────────────
  setMute(guildId, userId, mute) {
    return this.set('mutes', `${guildId}_${userId}`, mute);
  },

  getMute(guildId, userId) {
    return this.get('mutes', `${guildId}_${userId}`);
  },

  deleteMute(guildId, userId) {
    this.delete('mutes', `${guildId}_${userId}`);
  },

  // ─── Temp Bans ───────────────────────────────────────────────────────────
  setTempBan(guildId, userId, ban) {
    return this.set('tempbans', `${guildId}_${userId}`, ban);
  },

  getTempBan(guildId, userId) {
    return this.get('tempbans', `${guildId}_${userId}`);
  },

  getAllTempBans(guildId) {
    const all = readTable('tempbans');
    return Object.entries(all)
      .filter(([k]) => k.startsWith(`${guildId}_`))
      .map(([k, v]) => ({ userId: k.split('_')[1], ...v }));
  },

  deleteTempBan(guildId, userId) {
    this.delete('tempbans', `${guildId}_${userId}`);
  },

  // ─── Leveling ─────────────────────────────────────────────────────────────
  getLevelData(guildId, userId) {
    return this.get('levels', `${guildId}_${userId}`) || { xp: 0, level: 0, messages: 0 };
  },

  setLevelData(guildId, userId, data) {
    return this.set('levels', `${guildId}_${userId}`, data);
  },

  getLeaderboard(guildId, limit = 10) {
    const all = readTable('levels');
    return Object.entries(all)
      .filter(([k]) => k.startsWith(`${guildId}_`))
      .map(([k, v]) => ({ userId: k.split('_')[1], ...v }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  },

  // ─── Giveaways ───────────────────────────────────────────────────────────
  createGiveaway(giveaway) {
    return this.set('giveaways', giveaway.messageId, giveaway);
  },

  getGiveaway(messageId) {
    return this.get('giveaways', messageId);
  },

  updateGiveaway(messageId, data) {
    const existing = this.get('giveaways', messageId) || {};
    return this.set('giveaways', messageId, { ...existing, ...data });
  },

  deleteGiveaway(messageId) {
    this.delete('giveaways', messageId);
  },

  getActiveGiveaways(guildId) {
    const all = readTable('giveaways');
    const now = Date.now();
    return Object.values(all).filter(
      (g) => g.guildId === guildId && !g.ended && g.endsAt > now,
    );
  },

  // ─── Invites ─────────────────────────────────────────────────────────────
  getInviteData(guildId, userId) {
    return this.get('invites', `${guildId}_${userId}`) || { total: 0, fake: 0, left: 0 };
  },

  setInviteData(guildId, userId, data) {
    return this.set('invites', `${guildId}_${userId}`, data);
  },

  // ─── Tickets ─────────────────────────────────────────────────────────────
  createTicket(ticket) {
    return this.set('tickets', ticket.channelId, ticket);
  },

  getTicket(channelId) {
    return this.get('tickets', channelId);
  },

  closeTicket(channelId) {
    this.delete('tickets', channelId);
  },

  // ─── Settings ─────────────────────────────────────────────────────────────
  getSettings(guildId) {
    return this.get('settings', guildId) || {};
  },

  setSettings(guildId, settings) {
    const existing = this.getSettings(guildId);
    return this.set('settings', guildId, { ...existing, ...settings });
  },
};

export default db;
