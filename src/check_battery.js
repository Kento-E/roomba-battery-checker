const axios = require('axios');
const nodemailer = require('nodemailer');

// 環境変数から設定を読み込み
const IROBOT_USERNAME = process.env.IROBOT_USERNAME;
const IROBOT_PASSWORD = process.env.IROBOT_PASSWORD;
const SMTP_SERVER = process.env.SMTP_SERVER;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SEND_FROM = process.env.SEND_FROM;
const SEND_TO = process.env.SEND_TO;
const FORCE_NOTIFICATION = process.env.FORCE_NOTIFICATION === 'true';

// 環境変数のチェック
if (!IROBOT_USERNAME || !IROBOT_PASSWORD) {
  console.error('エラー: IROBOT_USERNAMEまたはIROBOT_PASSWORDが設定されていません');
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
      pass: SMTP_PASSWORD,
    },
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
このメールは自動送信されています。`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`通知メールを ${SEND_TO} に送信しました`);
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
}

// iRobot Cloud API 定数
const IROBOT_DISCOVERY_URL =
  'https://disc-prod.iot.irobotapi.com/v1/discover/endpoints?country_code=US';
const IROBOT_APP_ID = 'ANDROID-C7FB240E-DF34-42D7-AE4E-A8C17079A294';

// エンドポイントを検出する関数
async function discoverEndpoints() {
  const response = await axios.get(IROBOT_DISCOVERY_URL);
  const data = response.data;
  const gigya = data.gigya;
  const deployment = data.deployments[data.current_deployment];

  if (!gigya || !deployment) {
    throw new Error('iRobotエンドポイントの検出に失敗しました');
  }

  return {
    apiKey: gigya.api_key,
    gigyaBase: `https://accounts.${gigya.datacenter_domain}`,
    httpBase: deployment.httpBase,
  };
}

// GigyaにログインしてiRobot認証情報を取得する関数
async function loginGigya(endpoints) {
  const params = new URLSearchParams({
    apiKey: endpoints.apiKey,
    targetenv: 'mobile',
    loginID: IROBOT_USERNAME,
    password: IROBOT_PASSWORD,
    format: 'json',
    targetEnv: 'mobile',
  });

  const response = await axios.post(`${endpoints.gigyaBase}/accounts.login`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const body = response.data;

  if (body.errorCode !== 0) {
    throw new Error(`Gigya認証エラー: ${body.errorMessage || JSON.stringify(body)}`);
  }

  if (!body.UID || !body.UIDSignature || !body.signatureTimestamp) {
    throw new Error(`Gigyaレスポンスに必須フィールドがありません: ${JSON.stringify(body)}`);
  }

  return {
    uid: body.UID,
    uidSignature: body.UIDSignature,
    signatureTimestamp: body.signatureTimestamp,
  };
}

// iRobot Cloudにログインしてロボット情報を取得する関数
async function loginIRobot(endpoints, gigyaCredentials) {
  const response = await axios.post(`${endpoints.httpBase}/v2/login`, {
    app_id: IROBOT_APP_ID,
    assume_robot_ownership: 0,
    gigya: {
      signature: gigyaCredentials.uidSignature,
      timestamp: gigyaCredentials.signatureTimestamp,
      uid: gigyaCredentials.uid,
    },
  });

  const body = response.data;

  if (!body.robots || Object.keys(body.robots).length === 0) {
    throw new Error('アカウントに紐づくロボットが見つかりませんでした');
  }

  return body.robots;
}

// Cloud APIからバッテリー残量とデバイス名を取得する関数
async function getBatteryLevel() {
  console.log('iRobot Cloudエンドポイントを検出中...');
  const endpoints = await discoverEndpoints();

  console.log('iRobotアカウントにログイン中...');
  const gigyaCredentials = await loginGigya(endpoints);

  console.log('ロボット情報を取得中...');
  const robots = await loginIRobot(endpoints, gigyaCredentials);

  // 最初のロボットを使用
  const robotId = Object.keys(robots)[0];
  const robot = robots[robotId];

  const batteryLevel = robot?.batPct;
  const deviceName = robot?.name ?? 'Roomba';

  if (batteryLevel === undefined || batteryLevel === null) {
    throw new Error(
      'バッテリー情報を取得できませんでした。ロボットがオフラインの可能性があります。'
    );
  }

  return { batteryLevel, deviceName };
}

// メイン処理
async function main() {
  console.log('Roombaバッテリーチェックを開始します（Cloud API経由）');

  let batteryLevel, deviceName;
  try {
    ({ batteryLevel, deviceName } = await getBatteryLevel());
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }

  console.log(`デバイス: ${deviceName}, バッテリー残量: ${batteryLevel}%`);

  // バッテリーが100%でない場合、または強制通知フラグがONの場合はメール通知
  try {
    if (batteryLevel < 100) {
      console.log(`バッテリー残量が${batteryLevel}%です。メール通知を送信します`);
      const statusMessage =
        'バッテリーが100%ではないため、清掃スケジュールの実行に影響する可能性があります。\n充電を確認してください。';
      await sendNotification(batteryLevel, deviceName, statusMessage);
    } else if (FORCE_NOTIFICATION) {
      console.log('強制通知フラグがONです。バッテリー残量100%ですが通知を送信します（疎通確認）');
      const statusMessage =
        'バッテリーは満充電されています。\nこのメールは疎通確認のための強制通知です。';
      await sendNotification(batteryLevel, deviceName, statusMessage);
    } else {
      console.log(`バッテリー残量は${batteryLevel}%です。通知は不要です`);
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('バッテリーチェック完了');
}

main();
