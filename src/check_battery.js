const crypto = require('crypto');
const axios = require('axios');
const nodemailer = require('nodemailer');

// 環境変数から設定を読み込み
const IROBOT_USERNAME = process.env.IROBOT_USERNAME;
const IROBOT_PASSWORD = process.env.IROBOT_PASSWORD;
const DEBUG_LOG = process.env.DEBUG_LOG === 'true';

// デバッグログ出力関数
function debugLog(...args) {
  if (DEBUG_LOG) {
    console.log('[DEBUG]', ...args);
  }
}

// passwordフィールドをマスクする関数
function maskPassword(obj) {
  if (!obj || obj.password === undefined) return obj;
  const masked = { ...obj };
  masked.password = '***';
  return masked;
}
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

// AWS SigV4 署名キー生成
function getSigningKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = crypto.createHmac('sha256', 'AWS4' + secretKey).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

// AWS SigV4 署名付き GET リクエスト
async function awsSignedGet(host, path, credentials, region, service) {
  const accessKeyId = credentials?.AccessKeyId ?? credentials?.accessKeyId;
  const secretKey = credentials?.SecretKey ?? credentials?.SecretAccessKey;
  const sessionToken = credentials?.SessionToken ?? credentials?.Token;
  if (!accessKeyId || !secretKey) {
    throw new Error(
      'awsSignedGet: credentials missing required fields (AccessKeyId / SecretKey or SecretAccessKey)'
    );
  }

  const now = new Date();
  const amzdate =
    now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').slice(0, 15) + 'Z';
  const datestamp = amzdate.slice(0, 8);

  const headerParts = [`host:${host}`, `x-amz-date:${amzdate}`];
  if (sessionToken) headerParts.push(`x-amz-security-token:${sessionToken}`);
  const canonicalHeaders = headerParts.join('\n') + '\n';
  const signedHeaders = headerParts.map((h) => h.split(':')[0]).join(';');
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalRequest =
    `GET\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign =
    `${algorithm}\n${amzdate}\n${credentialScope}\n` +
    crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  const signingKey = getSigningKey(secretKey, datestamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader =
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders = { 'x-amz-date': amzdate, Authorization: authorizationHeader };
  if (sessionToken) requestHeaders['x-amz-security-token'] = sessionToken;

  return axios.get(`https://${host}${path}`, { headers: requestHeaders });
}

// エンドポイントを検出する関数
async function discoverEndpoints() {
  let response;
  try {
    response = await axios.get(IROBOT_DISCOVERY_URL);
  } catch (error) {
    throw new Error(`iRobotエンドポイントの検出に失敗しました: ${error.message}`);
  }
  const data = response.data;
  if (DEBUG_LOG) {
    debugLog('エンドポイント検出レスポンス:', JSON.stringify(data, null, 2));
  }
  const gigya = data.gigya;
  const deployment = data.deployments?.[data.current_deployment];

  if (!gigya || !deployment) {
    throw new Error('iRobotエンドポイントの検出に失敗しました');
  }

  return {
    apiKey: gigya.api_key,
    gigyaBase: `https://accounts.${gigya.datacenter_domain}`,
    httpBase: deployment.httpBase,
    // mqttAts は ATS 対応 IoT エンドポイント。旧形式の deployment では mqtt フィールドにフォールバック
    mqttAts: deployment.mqttAts ?? deployment.mqtt,
    awsRegion: deployment.awsRegion,
  };
}

// GigyaにログインしてiRobot認証情報を取得する関数
async function loginGigya(endpoints) {
  const params = new URLSearchParams({
    apiKey: endpoints.apiKey,
    loginID: IROBOT_USERNAME,
    password: IROBOT_PASSWORD,
    format: 'json',
    targetEnv: 'mobile',
  });

  let response;
  try {
    response = await axios.post(`${endpoints.gigyaBase}/accounts.login`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error) {
    throw new Error(`Gigya認証リクエストに失敗しました: ${error.message}`);
  }

  const body = response.data;
  if (DEBUG_LOG) {
    // UIDSignature・signatureTimestamp・sessionInfo は認証署名・セッショントークンのためマスク
    const safeGigyaBody = { ...body };
    if (safeGigyaBody.UIDSignature !== undefined) safeGigyaBody.UIDSignature = '***';
    if (safeGigyaBody.signatureTimestamp !== undefined) safeGigyaBody.signatureTimestamp = '***';
    if (safeGigyaBody.sessionInfo !== undefined) safeGigyaBody.sessionInfo = '***';
    debugLog('Gigyaログインレスポンス:', JSON.stringify(safeGigyaBody, null, 2));
  }

  if (body.errorCode !== 0) {
    throw new Error(
      `Gigya認証エラー: ${
        body.errorMessage
          || `errorCode=${body.errorCode}, statusCode=${body.statusCode}, callId=${body.callId}, time=${body.time}`
      }`
    );
  }

  if (!body.UID || !body.UIDSignature || !body.signatureTimestamp) {
    throw new Error(`Gigyaレスポンスに必須フィールドがありません: errorCode=${body.errorCode}, statusCode=${body.statusCode}, callId=${body.callId}, time=${body.time}`);
  }

  return {
    uid: body.UID,
    uidSignature: body.UIDSignature,
    signatureTimestamp: body.signatureTimestamp,
  };
}

// iRobot Cloudにログインしてロボット情報とAWS認証情報を取得する関数
async function loginIRobot(endpoints, gigyaCredentials) {
  let response;
  try {
    response = await axios.post(`${endpoints.httpBase}/v2/login`, {
      app_id: IROBOT_APP_ID,
      assume_robot_ownership: 0,
      gigya: {
        signature: gigyaCredentials.uidSignature,
        timestamp: gigyaCredentials.signatureTimestamp,
        uid: gigyaCredentials.uid,
      },
    });
  } catch (error) {
    throw new Error(`iRobot Cloudへのログインに失敗しました: ${error.message}`);
  }

  const body = response.data;
  if (DEBUG_LOG) {
    // password はMQTT認証パスワードのためマスク
    const safeRobots = {};
    for (const [id, r] of Object.entries(body.robots || {})) {
      safeRobots[id] = maskPassword(r);
    }
    debugLog('iRobot Cloudログインレスポンス robots:', JSON.stringify(safeRobots, null, 2));
    debugLog(
      'iRobot CloudログインレスポンスにAWS credentialsが含まれているか:',
      body.credentials != null ? 'あり' : 'なし'
    );
  }

  if (!body.robots || Object.keys(body.robots).length === 0) {
    throw new Error('アカウントに紐づくロボットが見つかりませんでした');
  }

  return { robots: body.robots, credentials: body.credentials ?? null };
}

// AWS IoT Device Shadow からロボット状態を取得する関数
async function getDeviceShadow(endpoints, robotId, credentials) {
  if (!endpoints.mqttAts || !endpoints.awsRegion) {
    throw new Error('IoTエンドポイントまたはAWSリージョン情報がありません');
  }

  // Thing Name（robotId）はURLエンコードしてパスセグメントに埋め込む
  const encodedRobotId = encodeURIComponent(robotId);

  let response;
  try {
    response = await awsSignedGet(
      endpoints.mqttAts,
      `/things/${encodedRobotId}/shadow`,
      credentials,
      endpoints.awsRegion,
      'iotdata'
    );
  } catch (error) {
    throw new Error(`Device Shadowの取得に失敗しました: ${error.message}`);
  }

  if (DEBUG_LOG) {
    debugLog('Device Shadowレスポンス:', JSON.stringify(response.data, null, 2));
  }

  return response.data;
}

// Cloud APIからバッテリー残量とデバイス名を取得する関数
async function getBatteryLevel() {
  console.log('iRobot Cloudエンドポイントを検出中...');
  const endpoints = await discoverEndpoints();

  console.log('iRobotアカウントにログイン中...');
  const gigyaCredentials = await loginGigya(endpoints);

  console.log('ロボット情報を取得中...');
  const { robots, credentials } = await loginIRobot(endpoints, gigyaCredentials);

  // 最初のロボットを使用
  const robotIds = Object.keys(robots);
  if (robotIds.length === 0) {
    throw new Error('アカウントに紐づくロボットが見つかりませんでした');
  }
  const robotId = robotIds[0];
  const robot = robots[robotId];
  if (DEBUG_LOG) {
    // password はMQTT認証パスワードのためマスク
    debugLog('ロボットデータ:', JSON.stringify(maskPassword(robot), null, 2));
  }

  let batteryLevel = robot?.batPct;
  const deviceName = robot?.name ?? 'Roomba';

  // ログインレスポンスに batPct がない場合、AWS IoT Device Shadow から取得
  if (batteryLevel == null && credentials) {
    console.log('Device Shadow経由でバッテリー残量を取得中...');
    try {
      const shadow = await getDeviceShadow(endpoints, robotId, credentials);
      batteryLevel = shadow?.state?.reported?.batPct;
    } catch (error) {
      console.warn(`Device Shadow取得に失敗しました: ${error.message}`);
    }
  }

  if (batteryLevel === undefined || batteryLevel === null) {
    console.warn(
      `警告: ${deviceName} のバッテリー情報を取得できませんでした。ロボットがオフラインの可能性があります。`
    );
    return { batteryLevel: null, deviceName };
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

  // ロボットがオフラインでバッテリー情報が取得できない場合はスキップ
  if (batteryLevel === null) {
    console.log('バッテリーチェック完了（ロボットオフラインのためスキップ）');
    return;
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
