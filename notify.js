const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ---------- 配置加载 ----------
const CONFIG_PATH = path.join(__dirname, 'notify-config.json');

function loadConfig() {
  const defaults = {
    email: { enabled: false, host: '', port: 465, secure: true, user: '', pass: '', from: '' },
    sms: { enabled: false, accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '', reminderTemplateCode: '' },
    targets: []
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return { ...defaults, ...saved };
    }
  } catch (e) { /* 忽略 */ }
  return defaults;
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function getSmsStatus(cfg) {
  const sms = cfg.sms || {};
  const fields = [
    ['accessKeyId', 'AccessKey ID'],
    ['accessKeySecret', 'AccessKey Secret'],
    ['signName', '短信签名'],
    ['templateCode', '模板 CODE']
  ];
  const missing = fields.filter(([key]) => !sms[key]).map(([, label]) => label);
  const ready = Boolean(sms.enabled) && missing.length === 0;
  const reminderMissing = [...missing, ...(!sms.reminderTemplateCode ? ['提醒模板 CODE'] : [])];
  return { ready, missing, remindersReady: ready && reminderMissing.length === 0, reminderMissing };
}

// ---------- 邮件 ----------
let mailTransporter = null;

function getTransporter(cfg) {
  if (!cfg.email || !cfg.email.enabled) return null;
  if (mailTransporter) return mailTransporter;
  mailTransporter = nodemailer.createTransport({
    host: cfg.email.host,
    port: cfg.email.port || 465,
    secure: cfg.email.secure !== false,
    auth: { user: cfg.email.user, pass: cfg.email.pass }
  });
  return mailTransporter;
}

async function sendEmail(to, subject, text, cfg) {
  const t = getTransporter(cfg);
  if (!t) return { ok: false, skip: true, reason: '邮件未配置' };
  try {
    await t.sendMail({ from: cfg.email.from || cfg.email.user, to, subject, text, html: `<p>${text}</p>` });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---------- 阿里云短信 ----------
async function sendSms(phone, params, cfg, templateCode = cfg.sms.templateCode) {
  const status = getSmsStatus(cfg);
  if (!status.ready || !templateCode) {
    const missing = [...status.missing, ...(!templateCode ? ['模板 CODE'] : [])];
    return { ok: false, skip: true, reason: `短信未就绪：${missing.join('、') || '短信开关未启用'}` };
  }
  try {
    const Core = require('@alicloud/pop-core');
    const client = new Core({
      accessKeyId: cfg.sms.accessKeyId,
      accessKeySecret: cfg.sms.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });
    const response = await client.request('SendSms', {
      PhoneNumbers: phone,
      SignName: cfg.sms.signName,
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify(params)
    }, { method: 'POST' });
    if (response.Code && response.Code !== 'OK') return { ok: false, error: response.Message || response.Code };
    return { ok: true, requestId: response.RequestId || null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---------- 统一通知入口 ----------
async function notifySelection({ user_name, dish_name, meal, targets }) {
  const cfg = loadConfig();
  const mealName = meal === 'lunch' ? '午饭' : '晚饭';
  const msg = `【猫家点菜】${user_name} 的${mealName}想吃「${dish_name}」`;
  const results = { email: [], sms: [] };

  for (const target of Array.isArray(targets) ? targets : (cfg.targets || [])) {
    if (target.email) {
      const r = await sendEmail(target.email, '猫家点菜通知', msg, cfg);
      results.email.push({ to: target.email, ...r });
    }
    if (target.phone) {
      const r = await sendSms(target.phone, { name: user_name, dish: dish_name, meal: mealName }, cfg);
      results.sms.push({ to: target.phone, ...r });
    }
  }
  return results;
}

async function notifyReminder({ meal, time, targets }) {
  const cfg = loadConfig();
  const mealName = meal === 'lunch' ? '午饭' : '晚饭';
  const msg = `【猫家点菜】${mealName}时间快到了(${time})，记得点菜哦！`;
  const status = getSmsStatus(cfg);
  const results = { email: [], sms: [] };

  for (const target of Array.isArray(targets) ? targets : []) {
    if (target.email) {
      const r = await sendEmail(target.email, '用餐提醒', msg, cfg);
      results.email.push({ to: target.email, ...r });
    }
    if (target.phone) {
      const r = status.remindersReady
        ? await sendSms(target.phone, { time, meal: mealName }, cfg, cfg.sms.reminderTemplateCode)
        : { ok: false, skip: true, reason: `用餐提醒短信未就绪：${status.reminderMissing.join('、') || status.missing.join('、') || '短信开关未启用'}` };
      results.sms.push({ to: target.phone, ...r });
    }
  }
  return results;
}

module.exports = { loadConfig, saveConfig, getSmsStatus, notifySelection, notifyReminder, sendEmail, sendSms };
