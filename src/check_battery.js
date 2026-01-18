const dorita980 = require('dorita980');
const nodemailer = require('nodemailer');

// 環境変数から設定を読み込み
const BLID = process.env.ROOMBA_BLID;
const PASSWORD = process.env.ROOMBA_PASSWORD;
const SMTP_SERVER = process.env.SMTP_SERVER;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const FORCE_NOTIFICATION = process.env.FORCE_NOTIFICATION === 'true';

// 環境変数のチェック
if (!BLID || !PASSWORD) {
  console.error('エラー: ROOMBA_BLIDまたはROOMBA_PASSWORDが設定されていません');
  process.exit(1);
}

if (!SMTP_SERVER || !SMTP_USER || !SMTP_PASSWORD || !NOTIFICATION_EMAIL) {
  console.error('エラー: SMTP設定が不完全です');
  console.error('必要な環境変数: SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, NOTIFICATION_EMAIL');
  process.exit(1);
}

// メール送信関数
async function sendNotification(batteryLevel, deviceName) {
  const parsedSmtpPort = parseInt(SMTP_PORT, 10);
  if (Number.isNaN(parsedSmtpPort)) {
    console.error('警告: 無効なSMTPポート番号が設定されています。デフォルトポート587を使用します。');
  }
  const SMTP_PORT_NUMBER = Number.isNaN(parsedSmtpPort) ? 587 : parsedSmtpPort;

  const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT_NUMBER,
    secure: SMTP_PORT_NUMBER === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });

  const mailOptions = {
    from: SMTP_USER,
    to: NOTIFICATION_EMAIL,
    subject: `[Roomba通知] ${deviceName}のバッテリー残量が${batteryLevel}%です`,
    text: `${deviceName}のバッテリー状態をお知らせします。

現在のバッテリー残量: ${batteryLevel}%

バッテリーが100%ではないため、清掃スケジュールの実行に影響する可能性があります。
充電を確認してください。

---
このメールは自動送信されています。`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`通知メールを ${NOTIFICATION_EMAIL} に送信しました`);
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
}

// メイン処理
async function main() {
  console.log('Roombaバッテリーチェックを開始します（クラウドAPI経由）');
  
  const robot = new dorita980.Cloud(BLID, PASSWORD);

  try {
    // クラウド経由でRoombaに接続
    await new Promise((resolve, reject) => {
      robot.on('connect', resolve);
      robot.on('error', reject);
    });

    console.log('Roombaに接続しました');

    // バッテリー状態を取得
    const state = await robot.getRobotState(['batPct', 'name']);
    
    const batteryLevel = state.batPct || 0;
    const deviceName = state.name || 'Roomba';

    console.log(`デバイス: ${deviceName}, バッテリー残量: ${batteryLevel}%`);

    // バッテリーが100%でない場合、または強制通知フラグがONの場合はメール通知
    if (batteryLevel < 100 || FORCE_NOTIFICATION) {
      if (FORCE_NOTIFICATION && batteryLevel === 100) {
        console.log('強制通知フラグがONです。バッテリー残量100%ですが通知を送信します（疎通確認）');
      } else {
        console.log(`バッテリー残量が${batteryLevel}%です。メール通知を送信します`);
      }
      await sendNotification(batteryLevel, deviceName);
    } else {
      console.log(`バッテリー残量は${batteryLevel}%です。通知は不要です`);
    }

    await robot.end();
    console.log('バッテリーチェック完了');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    await robot.end();
    process.exit(1);
  }
}

main();
