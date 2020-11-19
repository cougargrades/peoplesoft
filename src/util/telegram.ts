import fetch from 'node-fetch';
import { Telegram } from 'telegraf';
import { ConfigTelegram } from './config';

export async function sendMessage(who: ConfigTelegram, message: string) {
  const bot = new Telegram(who.BotToken);
  return await bot.sendMessage(who.ChatId, message, { parse_mode: 'HTML' });
}

export async function sendPhoto(who: ConfigTelegram, photo: Buffer) {
  const bot = new Telegram(who.BotToken);
  return await bot.sendPhoto(who.ChatId, { source: photo });
}