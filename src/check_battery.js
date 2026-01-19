const nodemailer = require('nodemailer');

// 環境変数から設定を読み込み
const BLID = process.env.ROOMBA_BLID;
const PASSWORD = process.env.ROOMBA_PASSWORD;
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

// メイン処理
async function main() {
  console.error('❌ iRobot Cloud APIは廃止されました');
  console.error('');
  console.error('【問題】');
  console.error('iRobotのCloud API（irobot.axeda.com）は2024年に廃止され、現在は利用できません。');
  console.error('このため、GitHub Actionsからクラウド経由でRoombaにアクセスすることはできなくなりました。');
  console.error('');
  console.error('【代替案】');
  console.error('1. セルフホステッドランナー + Local API');
  console.error('   - Roombaと同じネットワーク上でGitHub Actionsセルフホステッドランナーを実行');
  console.error('   - dorita980のLocal APIを使用（クラウド経由不要）');
  console.error('   - 詳細: https://github.com/koalazak/dorita980#local-api');
  console.error('');
  console.error('2. rest980ブリッジサーバー');
  console.error('   - Roombaと同じネットワーク上でrest980サーバーを実行');
  console.error('   - GitHub ActionsからHTTP API経由でアクセス');
  console.error('   - 詳細: https://github.com/koalazak/rest980');
  console.error('');
  console.error('【参考情報】');
  console.error('- dorita980 GitHub: https://github.com/koalazak/dorita980');
  console.error('- 関連Issue: https://github.com/koalazak/dorita980/issues/81');
  console.error('');
  
  process.exit(1);
}

main();
