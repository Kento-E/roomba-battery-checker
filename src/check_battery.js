const dorita980 = require('dorita980');
const nodemailer = require('nodemailer');

// 環境変数から設定を読み込み
const BLID = process.env.ROOMBA_BLID;
const PASSWORD = process.env.ROOMBA_PASSWORD;
const ROOMBA_IP = process.env.ROOMBA_IP;
const SMTP_SERVER = process.env.SMTP_SERVER;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SEND_FROM = process.env.SEND_FROM;
const SEND_TO = process.env.SEND_TO;
const FORCE_NOTIFICATION = process.env.FORCE_NOTIFICATION === 'true';

// 環境変数のチェック
if (!BLID || !PASSWORD) {
  console.error('エラー: ROOMBA_BLIDまたはROOMBA_PASSWORDが設定されていません');
  process.exit(1);
}

// IPアドレスの形式チェック（指定されている場合のみ）
if (ROOMBA_IP) {
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ROOMBA_IP)) {
    console.error('エラー: ROOMBA_IPの形式が不正です。正しいIPアドレス（例: 192.168.1.100）を指定してください');
    process.exit(1);
  }
}

if (!SMTP_SERVER || !SMTP_USER || !SMTP_PASSWORD || !SEND_TO) {
  console.error('エラー: SMTP設定が不完全です');
  console.error('必要な環境変数: SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, SEND_TO');
  process.exit(1);
}

// SMTPポート番号の検証とデフォルト値設定
const parsedSmtpPort = parseInt(SMTP_PORT, 10);
if (Number.isNaN(parsedSmtpPort)) {
  console.error('エラー: 無効なSMTPポート番号が設定されています:', SMTP_PORT);
  process.exit(1);
}
const SMTP_PORT_NUMBER = parsedSmtpPort;

// メール送信関数
async function sendNotification(batteryLevel, deviceName, statusMessage) {
  const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT_NUMBER,
    // ポート465はSSL/TLS、ポート587はSTARTTLSを使用
    secure: SMTP_PORT_NUMBER === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });

  const bodyMessage = `${deviceName}のバッテリー状態をお知らせします。

現在のバッテリー残量: ${batteryLevel}%

${statusMessage}`;

  const mailOptions = {
    from: SEND_FROM || SMTP_USER,
    // カンマ区切りで複数のメールアドレスに送信可能
    to: SEND_TO,
    subject: `[Roomba通知] ${deviceName}のバッテリー残量が${batteryLevel}%です`,
    text: `${bodyMessage}

---
このメールは自動送信されています。`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`通知メールを ${SEND_TO} に送信しました`);
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
}

// Roomba IPアドレスを取得する関数（自動検出または手動指定）
async function getRoombaIP() {
  if (ROOMBA_IP) {
    console.log(`指定されたIPアドレスを使用: ${ROOMBA_IP}`);
    return ROOMBA_IP;
  }

  console.log('Roombaを自動検出中...');
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Roombaの自動検出がタイムアウトしました。ROOMBA_IP環境変数を設定してください。'));
    }, 10000); // 10秒でタイムアウト

    dorita980.getRobotIP((error, ip) => {
      clearTimeout(timeout);
      if (error) {
        reject(new Error(`Roombaの自動検出に失敗しました: ${error.message}`));
      } else {
        console.log(`Roombaを検出しました: ${ip}`);
        resolve(ip);
      }
    });
  });
}

// メイン処理
async function main() {
  console.log('Roombaバッテリーチェックを開始します（Local API経由）');
  
  let roombaIP;
  try {
    roombaIP = await getRoombaIP();
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
  
  const robot = new dorita980.Local(BLID, PASSWORD, roombaIP);

  robot.on('connect', async () => {
    try {
      console.log('Roomba状態を取得中...');
      
      // Local APIでバッテリー状態を取得
      const state = await robot.getRobotState(['batPct', 'name']);
      
      const batteryLevel = state?.batPct;
      const deviceName = state?.name ?? 'Roomba';
      
      // バッテリー情報が取得できない場合はエラー
      if (batteryLevel === undefined || batteryLevel === null) {
        throw new Error('バッテリー情報を取得できませんでした。');
      }
      
      console.log(`デバイス: ${deviceName}, バッテリー残量: ${batteryLevel}%`);

      // バッテリーが100%でない場合、または強制通知フラグがONの場合はメール通知
      if (batteryLevel < 100) {
        console.log(`バッテリー残量が${batteryLevel}%です。メール通知を送信します`);
        const statusMessage = 'バッテリーが100%ではないため、清掃スケジュールの実行に影響する可能性があります。\n充電を確認してください。';
        await sendNotification(batteryLevel, deviceName, statusMessage);
      } else if (FORCE_NOTIFICATION) {
        console.log('強制通知フラグがONです。バッテリー残量100%ですが通知を送信します（疎通確認）');
        const statusMessage = 'バッテリーは満充電されています。\nこのメールは疎通確認のための強制通知です。';
        await sendNotification(batteryLevel, deviceName, statusMessage);
      } else {
        console.log(`バッテリー残量は${batteryLevel}%です。通知は不要です`);
      }

      console.log('バッテリーチェック完了');
      await robot.end();
      process.exit(0);
    } catch (error) {
      console.error('エラーが発生しました:', error);
      await robot.end();
      process.exit(1);
    }
  });

  robot.on('error', async (error) => {
    console.error('Roomba接続エラー:', error);
    try {
      await robot.end();
    } catch (e) {
      // 接続終了時のエラーは無視
    }
    process.exit(1);
  });
}

main();
