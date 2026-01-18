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

// SMTPポート番号の検証とデフォルト値設定
const parsedSmtpPort = parseInt(SMTP_PORT, 10);
if (Number.isNaN(parsedSmtpPort)) {
  console.error('エラー: 無効なSMTPポート番号が設定されています:', SMTP_PORT);
  process.exit(1);
}
const SMTP_PORT_NUMBER = parsedSmtpPort;

// メール送信関数
async function sendNotification(batteryLevel, deviceName, isForceNotification = false) {
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

  // 強制通知の場合とバッテリー不足の場合でメッセージを変更
  const statusMessage = isForceNotification && batteryLevel === 100
    ? 'バッテリーは満充電されています。\nこのメールは疎通確認のための強制通知です。'
    : 'バッテリーが100%ではないため、清掃スケジュールの実行に影響する可能性があります。\n充電を確認してください。';

  const bodyMessage = `${deviceName}のバッテリー状態をお知らせします。

現在のバッテリー残量: ${batteryLevel}%

${statusMessage}`;

  const mailOptions = {
    from: SMTP_USER,
    // カンマ区切りで複数のメールアドレスに送信可能
    to: NOTIFICATION_EMAIL,
    subject: `[Roomba通知] ${deviceName}のバッテリー残量が${batteryLevel}%です`,
    text: `${bodyMessage}

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
      await sendNotification(batteryLevel, deviceName, FORCE_NOTIFICATION);
    } else {
      console.log(`バッテリー残量は${batteryLevel}%です。通知は不要です`);
    }

    await robot.end();
    console.log('バッテリーチェック完了');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    try {
      if (robot && typeof robot.end === 'function') {
        await robot.end();
      }
    } catch (endError) {
      console.error('robot.end() の実行中にエラーが発生しました:', endError);
    }
    process.exit(1);
  }
}

main();
