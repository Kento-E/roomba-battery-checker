const crypto = require('crypto');
const axios = require('axios');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 環境変数から設定を読み込み
const IROBOT_USERNAME = process.env.IROBOT_USERNAME;
const IROBOT_PASSWORD = process.env.IROBOT_PASSWORD;
const DEBUG_LOG = process.env.DEBUG_LOG === 'true';
const LOCAL_ONLY =
  process.env.LOCAL_ONLY === 'true' ||
  process.argv.includes('-l') ||
  process.argv.includes('--local-only');

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

if (!LOCAL_ONLY && (!SMTP_SERVER || !SMTP_USER || !SMTP_PASSWORD || !SEND_TO)) {
  console.error('エラー: SMTP設定が不完全です');
  console.error('必要な環境変数: SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, SEND_TO');
  process.exit(1);
}

// SMTPポート番号の検証とデフォルト値設定
let SMTP_PORT_NUMBER = 587;
if (!LOCAL_ONLY) {
  const parsedSmtpPort = parseInt(SMTP_PORT, 10);
  if (Number.isNaN(parsedSmtpPort)) {
    console.error('エラー: 無効なSMTPポート番号が設定されています:', SMTP_PORT);
    process.exit(1);
  }
  SMTP_PORT_NUMBER = parsedSmtpPort;
}

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
  const kDate = crypto
    .createHmac('sha256', 'AWS4' + secretKey)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

// AWS SigV4 署名付き GET リクエスト
async function awsSignedGet(host, path, credentials, region, service) {
  const accessKeyId = credentials?.AccessKeyId ?? credentials?.accessKeyId;
  const secretKey =
    credentials?.SecretKey ?? credentials?.SecretAccessKey ?? credentials?.secretAccessKey;
  const sessionToken = credentials?.SessionToken ?? credentials?.Token ?? credentials?.sessionToken;
  if (!accessKeyId || !secretKey) {
    throw new Error(
      'awsSignedGet: credentials missing required fields (AccessKeyId / SecretKey, SecretAccessKey, or secretAccessKey)'
    );
  }

  const now = new Date();
  const amzdate =
    now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .slice(0, 15) + 'Z';
  const datestamp = amzdate.slice(0, 8);

  const headerParts = [`host:${host}`, `x-amz-date:${amzdate}`];
  if (sessionToken) headerParts.push(`x-amz-security-token:${sessionToken}`);
  const canonicalHeaders = headerParts.join('\n') + '\n';
  const signedHeaders = headerParts.map((h) => h.split(':')[0]).join(';');
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalRequest = `GET\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

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

  if (DEBUG_LOG) {
    debugLog('AWS SigV4署名リクエスト詳細:', {
      accessKeyIdPrefix: accessKeyId ? accessKeyId.substring(0, 4) : null,
      secretKeyLength: secretKey ? secretKey.length : 0,
      hasSessionToken: !!sessionToken,
      amzdate,
      credentialScope,
      signedHeaders,
      canonicalRequestHash: crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    });
  }

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
    httpBaseAuth: deployment.httpBaseAuth ?? null,
    // mqttAts は ATS 対応 IoT エンドポイント。旧形式の deployment では mqtt フィールドにフォールバック
    mqttAts: deployment.mqttAts ?? deployment.mqtt,
    awsRegion: deployment.awsRegion,
    // irbtTopics は iRobot 固有の MQTT トピックプレフィックス（例: "v011-irbthbu"）
    // v4 Roomba はこのプレフィックス配下のトピックでロボット状態（バッテリー等）をパブリッシュする
    irbtTopics: deployment.irbtTopics ?? null,
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
      `Gigya認証エラー: ${body.errorMessage ||
      `errorCode=${body.errorCode}, statusCode=${body.statusCode}, callId=${body.callId}, time=${body.time}`
      }`
    );
  }

  if (!body.UID || !body.UIDSignature || !body.signatureTimestamp) {
    throw new Error(
      `Gigyaレスポンスに必須フィールドがありません: errorCode=${body.errorCode}, statusCode=${body.statusCode}, callId=${body.callId}, time=${body.time}`
    );
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
    debugLog('iRobot Cloudログインレスポンス top-level keys:', Object.keys(body));
    debugLog('iRobot Cloudログインレスポンス robots:', JSON.stringify(safeRobots, null, 2));
    debugLog(
      'iRobot CloudログインレスポンスにAWS credentialsが含まれているか:',
      body.credentials != null ? 'あり' : 'なし'
    );
    debugLog('IoTカスタム認証情報:', {
      hasIotToken: body.iot_token != null,
      hasIotSignature: body.iot_signature != null,
      iotAuthorizerName: body.iot_authorizer_name ?? null,
      iotClientId: body.iot_clientid ?? null,
    });
  }

  if (!body.robots || Object.keys(body.robots).length === 0) {
    throw new Error('アカウントに紐づくロボットが見つかりませんでした');
  }

  return {
    robots: body.robots,
    credentials: body.credentials ?? null,
    iotToken: body.iot_token ?? null,
    iotSignature: body.iot_signature ?? null,
    iotAuthorizerName: body.iot_authorizer_name ?? null,
    iotClientId: body.iot_clientid ?? null,
  };
}

// 指定時間（ミリ秒）待機する関数
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// AWS IoT Device Shadow からロボット状態を取得する関数
async function getDeviceShadow(endpoints, robotId, credentials) {
  if (!endpoints.mqttAts || !endpoints.awsRegion) {
    throw new Error('IoTエンドポイントまたはAWSリージョン情報がありません');
  }

  // Thing Name（robotId）はURLエンコードしてパスセグメントに埋め込む
  const encodedRobotId = encodeURIComponent(robotId);

  if (DEBUG_LOG) {
    debugLog('Device Shadow取得リクエスト:', {
      url: `https://${endpoints.mqttAts}/things/${encodedRobotId}/shadow`,
      region: endpoints.awsRegion,
      credentialFields: credentials ? Object.keys(credentials) : null,
    });
  }

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
    if (error.response) {
      const status = error.response?.status;
      if (DEBUG_LOG) {
        debugLog('Device Shadow HTTPエラーレスポンス:', {
          status,
          body: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw new Error(`Device Shadowの取得に失敗しました（HTTP ${status}）`, { cause: error });
    }
    throw new Error(
      `Device Shadowの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  if (DEBUG_LOG) {
    debugLog('Device Shadowレスポンス:', JSON.stringify(response.data, null, 2));
  }

  return response.data;
}

// Device Shadow取得をリトライ付きで実行する関数（AWS IoT直接アクセス）
async function getDeviceShadowWithRetry(
  endpoints,
  robotId,
  credentials,
  maxRetries = 3,
  retryDelayMs = 5000
) {
  if (maxRetries < 1) {
    throw new Error('maxRetries は 1 以上の値を指定してください');
  }
  let lastError;
  const retryDelaySeconds = retryDelayMs / 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getDeviceShadow(endpoints, robotId, credentials);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.warn(
          `Device Shadow取得に失敗しました（試行${attempt}/${maxRetries}）: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log(`${retryDelaySeconds}秒後にリトライします...`);
        await sleep(retryDelayMs);
      }
    }
  }
  const lastErrorMessage =
    lastError instanceof Error
      ? lastError.message
      : lastError != null
        ? String(lastError)
        : '不明なエラー';
  const finalMessage = `${maxRetries}回試行しましたがDevice Shadowの取得に失敗しました: ${lastErrorMessage}`;
  if (lastError != null) {
    throw new Error(finalMessage, { cause: lastError });
  }
  throw new Error(finalMessage);
}

// AWS IoT カスタム認証者（Custom Authorizer）経由でDevice Shadowを取得する関数（HTTP REST - フォールバック）
// iot_token / iot_signature / iot_authorizer_name を使ってAWS IoT CoreのHTTP REST APIにアクセスする
// 注意: この方法は Lambda 認証者ポリシーに iot:GetThingShadow が含まれている場合のみ機能する
async function getDeviceShadowViaCustomAuth(
  endpoints,
  robotId,
  iotToken,
  iotSignature,
  iotAuthorizerName,
  iotClientId
) {
  if (!endpoints.mqttAts) {
    throw new Error('IoTエンドポイント情報がありません');
  }
  if (!iotToken || !iotSignature || !iotAuthorizerName) {
    throw new Error(
      `IoTカスタム認証情報が不足しています: iotToken=${!!iotToken}, iotSignature=${!!iotSignature}, iotAuthorizerName=${!!iotAuthorizerName}`
    );
  }

  const encodedRobotId = encodeURIComponent(robotId);
  const url = `https://${endpoints.mqttAts}/things/${encodedRobotId}/shadow`;

  // HTTPヘッダーではURLエンコード不要（WebSocketのクエリパラメータの場合のみ必要）
  // URLエンコードすると Lambda がヘッダー値をそのまま署名として扱うため検証失敗の原因となる
  const headers = {
    Authorization: iotToken,
    'x-amz-customauthorizer-name': iotAuthorizerName,
    'x-amz-customauthorizer-signature': iotSignature,
  };

  // iot_clientid がある場合はヘッダーに追加（Lambda認証者がclientIdを確認する可能性）
  if (iotClientId) {
    headers['x-amz-iot-client-id'] = iotClientId;
  }

  if (DEBUG_LOG) {
    debugLog('IoTカスタム認証者経由Device Shadow取得リクエスト:', {
      url,
      authorizerName: iotAuthorizerName,
      hasToken: !!iotToken,
      hasSignature: !!iotSignature,
      hasClientId: !!iotClientId,
      tokenPrefix: iotToken ? iotToken.substring(0, 20) + '...' : null,
      signatureHasUrlUnsafeChars: iotSignature ? /[+/=]/.test(iotSignature) : false,
      signaturePrefix: iotSignature ? iotSignature.substring(0, 20) + '...' : null,
      requestHeaders: Object.keys(headers),
    });
  }

  let response;
  try {
    response = await axios.get(url, { headers });
  } catch (error) {
    if (error.response) {
      const status = error.response?.status;
      if (DEBUG_LOG) {
        debugLog('IoTカスタム認証者 Device Shadow HTTPエラーレスポンス:', {
          status,
          body: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw new Error(`IoTカスタム認証者経由のDevice Shadow取得に失敗しました（HTTP ${status}）`, {
        cause: error,
      });
    }
    throw new Error(
      `IoTカスタム認証者経由のDevice Shadow取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  if (DEBUG_LOG) {
    debugLog(
      'IoTカスタム認証者経由Device Shadowレスポンス:',
      JSON.stringify(response.data, null, 2)
    );
  }

  return response.data;
}

// httpBaseAuth経由でDevice Shadowを取得する関数（SigV4署名・execute-api）
// auth2.prod.iot.irobotapi.com は AWS API Gateway エンドポイントのため、
// credentials を使って execute-api サービスで SigV4 署名を付けてアクセスする
async function getDeviceShadowViaHttpBaseAuth(endpoints, robotId, credentials) {
  if (!endpoints.httpBaseAuth) {
    throw new Error('httpBaseAuthエンドポイント情報がありません');
  }
  if (!credentials) {
    throw new Error('SigV4署名に必要なcredentialsがありません');
  }

  const encodedRobotId = encodeURIComponent(robotId);

  // httpBaseAuth URLからホスト名を抽出
  const httpBaseAuthUrl = new URL(endpoints.httpBaseAuth);
  const host = httpBaseAuthUrl.host;
  const path = `/v2/things/${encodedRobotId}/shadow`;

  // auth2.prod.iot.irobotapi.com は API Gateway（us-east-1 リージョン）
  const region = 'us-east-1';

  if (DEBUG_LOG) {
    debugLog('httpBaseAuth SigV4経由Device Shadow取得リクエスト:', {
      url: `https://${host}${path}`,
      region,
      service: 'execute-api',
      credentialFields: credentials ? Object.keys(credentials) : null,
    });
  }

  let response;
  try {
    response = await awsSignedGet(host, path, credentials, region, 'execute-api');
  } catch (error) {
    if (error.response) {
      const status = error.response?.status;
      if (DEBUG_LOG) {
        debugLog('httpBaseAuth SigV4 Device Shadow HTTPエラーレスポンス:', {
          status,
          body: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw new Error(`httpBaseAuth SigV4経由のDevice Shadow取得に失敗しました（HTTP ${status}）`, {
        cause: error,
      });
    }
    throw new Error(
      `httpBaseAuth SigV4経由のDevice Shadow取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  if (DEBUG_LOG) {
    debugLog(
      'httpBaseAuth SigV4経由Device Shadowレスポンス:',
      JSON.stringify(response.data, null, 2)
    );
  }

  return response.data;
}

// MQTT over WebSocket（IoTカスタム認証者）経由でDevice Shadowを取得する関数
// HTTPのDevice Shadow RESTは403となるが、MQTTではカスタム認証者のポリシーによりアクセス可能
async function getDeviceShadowViaMqttWebSocket(
  endpoints,
  robotId,
  iotToken,
  iotSignature,
  iotAuthorizerName,
  iotClientId
) {
  if (!endpoints.mqttAts) {
    throw new Error('IoTエンドポイント情報がありません');
  }
  if (!iotToken || !iotSignature || !iotAuthorizerName) {
    throw new Error(
      `IoTカスタム認証情報が不足しています: iotToken=${!!iotToken}, iotSignature=${!!iotSignature}, iotAuthorizerName=${!!iotAuthorizerName}`
    );
  }

  // WebSocketアップグレードリクエストのヘッダーでカスタム認証者情報を渡す
  // iRobotカスタム認証者は x-irobot-auth ヘッダーをトークンとして使用する
  // （標準の x-amz-customauthorizer-token ではない点に注意）
  const wsUrl = `wss://${endpoints.mqttAts}:443/mqtt`;
  const wsHeaders = {
    'X-Amz-CustomAuthorizer-Name': iotAuthorizerName,
    'X-Amz-CustomAuthorizer-Signature': iotSignature,
    'x-irobot-auth': iotToken,
    'User-Agent': 'iRobot/2.17.1 Android/28',
  };

  const clientId = iotClientId ?? `app-${IROBOT_APP_ID}-${crypto.randomBytes(4).toString('hex')}`;

  if (DEBUG_LOG) {
    debugLog('MQTT WebSocket経由Device Shadow取得リクエスト:', {
      endpoint: endpoints.mqttAts,
      clientId,
      robotId,
      authorizerName: iotAuthorizerName,
      irbtTopics: endpoints.irbtTopics ?? '(なし)',
      // ヘッダー値には認証情報が含まれるためキー名のみ出力
      wsHeaderKeys: Object.keys(wsHeaders),
    });
  }

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(wsUrl, {
      clientId,
      clean: true,
      reconnectPeriod: 0,
      connectTimeout: 10000,
      keepalive: 30,
      wsOptions: { headers: wsHeaders },
    });

    // ロボットがアクティブ時にリアルタイムで状態をプッシュするトピック
    // Y311060 など新しい Roomba モデルは batPct を永続 Shadow に保存せず
    // 状態遷移時（充電中→稼働中など）に update/accepted へプッシュする
    const updateAcceptedTopic = `$aws/things/${robotId}/shadow/update/accepted`;
    // iRobot 固有のテレメトリトピック（例: "v007-irbthbu"）
    // v4 Roomba はこのプレフィックス配下のトピックでロボット状態（バッテリー等）をパブリッシュする
    // kilianp07/roomba-v4 の v4-api.md で `irbtTopics` フィールドとして確認
    const irbtTopicWildcard = endpoints.irbtTopics ? `${endpoints.irbtTopics}/${robotId}/#` : null;

    let settled = false;
    // ロボットが定期的にテレメトリをパブリッシュするまで待つ時間として 30 秒を確保する
    const MQTT_TIMEOUT_MS = 30000;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.end(true);
        reject(
          new Error(`MQTT batPct が見つかりませんでした（${MQTT_TIMEOUT_MS / 1000}秒タイムアウト）`)
        );
      }
    }, MQTT_TIMEOUT_MS);

    function done(err, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end(true);
      if (err) reject(err);
      else resolve(result);
    }

    client.on('connect', () => {
      debugLog('MQTT接続成功');
      // $aws/things/* へのパブリッシュはカスタム認証者ポリシーにより未認可切断を引き起こす可能性がある
      // そのためパッシブ受信のみとし、更新通知トピックと irbt テレメトリトピックのみ購読する
      const topicsToSubscribe = [updateAcceptedTopic];
      if (irbtTopicWildcard) {
        topicsToSubscribe.push(irbtTopicWildcard);
      } else {
        console.warn(
          'MQTT: irbtTopics が設定されていません。shadow/update/accepted のみ購読します'
        );
      }
      client.subscribe(topicsToSubscribe, { qos: 0 }, (err) => {
        if (err) {
          done(
            new Error(`MQTT購読に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
          );
          return;
        }
        // パッシブ受信のみ: shadow GET は送信しない
        // （未認可パブリッシュがサーバー側切断を引き起こす可能性があるため）
        debugLog('MQTT購読完了。ロボットの状態更新を待機中...');
      });
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (DEBUG_LOG) {
          debugLog(`MQTT メッセージ受信 (${topic}):`, JSON.stringify(payload, null, 2));
        }
        // Shadow 形式: { state: { reported: { batPct: N } } }
        // irbt テレメトリ形式: { batPct: N } または { state: { batPct: N } } の可能性がある
        const batPct =
          payload?.state?.reported?.batPct ?? payload?.state?.batPct ?? payload?.batPct;
        if (batPct != null) {
          // batPct が含まれるメッセージが届いたので解決
          // Shadow 形式に統一して返す
          const shadow =
            payload?.state?.reported != null
              ? payload
              : { state: { reported: { ...payload, batPct } } };
          done(null, shadow);
        } else if (DEBUG_LOG) {
          debugLog(
            `MQTT (${topic}) に batPct なし。他のトピックで引き続き待機中...`,
            JSON.stringify(payload).substring(0, 200)
          );
        }
      } catch (parseErr) {
        done(
          new Error(
            `MQTTメッセージのJSONパースに失敗しました: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
          )
        );
      }
    });

    client.on('error', (err) => {
      done(new Error(`MQTT接続エラー: ${err instanceof Error ? err.message : String(err)}`));
    });

    // 予期しない切断（認証エラーによるサーバー側クローズなど）を検知する
    client.on('close', () => {
      if (!settled) {
        done(new Error('MQTT接続が切断されました（認証エラーまたはネットワーク障害）'));
      }
    });

    client.on('offline', () => {
      if (!settled) {
        done(new Error('MQTTクライアントがオフラインになりました'));
      }
    });
  });
}

// Cloud APIからバッテリー残量とデバイス名を取得する関数
async function getBatteryLevel() {
  console.log('iRobot Cloudエンドポイントを検出中...');
  const endpoints = await discoverEndpoints();

  console.log('iRobotアカウントにログイン中...');
  const gigyaCredentials = await loginGigya(endpoints);

  console.log('ロボット情報を取得中...');
  const { robots, credentials, iotToken, iotSignature, iotAuthorizerName, iotClientId } =
    await loginIRobot(endpoints, gigyaCredentials);

  // 最初のロボットを使用
  const robotIds = Object.keys(robots);
  if (robotIds.length === 0) {
    throw new Error('アカウントに紐づくロボットが見つかりませんでした');
  }
  const robotId = robotIds[0];
  const robot = robots[robotId];
  if (DEBUG_LOG) {
    // password はMQTT認証パスワードのためマスク
    debugLog('ロボットデータ top-level keys:', Object.keys(robot || {}));
    debugLog('ロボットデータ:', JSON.stringify(maskPassword(robot), null, 2));
  }

  let batteryLevel = robot?.batPct;
  const deviceName = robot?.name ?? 'Roomba';

  // ログインレスポンスに batPct がない場合、Device Shadow から取得
  if (batteryLevel == null) {
    // 試行1: MQTT over WebSocket（IoTカスタム認証者経由）
    // HTTPのDevice Shadow RESTはすべて403になるためMQTTが最も確実な方法
    if (iotToken && iotSignature && iotAuthorizerName && endpoints.mqttAts) {
      try {
        console.log('Device Shadow経由でバッテリー残量を取得中（MQTT WebSocket）...');
        const shadow = await getDeviceShadowViaMqttWebSocket(
          endpoints,
          robotId,
          iotToken,
          iotSignature,
          iotAuthorizerName,
          iotClientId
        );
        batteryLevel = shadow?.state?.reported?.batPct;
        if (batteryLevel != null) {
          return { batteryLevel, deviceName };
        }
      } catch (mqttError) {
        console.warn(
          `MQTT WebSocket経由での取得に失敗（次の方法を試みます）: ${mqttError instanceof Error ? mqttError.message : String(mqttError)}`
        );
        if (DEBUG_LOG) {
          debugLog('MQTT WebSocketエラー詳細:', mqttError);
        }
      }
    } else if (DEBUG_LOG) {
      debugLog('MQTT WebSocketスキップ:', {
        hasIotToken: !!iotToken,
        hasIotSignature: !!iotSignature,
        hasIotAuthorizerName: !!iotAuthorizerName,
        hasMqttAts: !!endpoints.mqttAts,
      });
    }

    // 試行2: httpBaseAuth経由（SigV4署名・execute-api）
    // auth2.prod.iot.irobotapi.com は AWS API Gateway のため execute-api で SigV4 署名
    if (credentials && endpoints.httpBaseAuth) {
      try {
        console.log(
          'Device Shadow経由でバッテリー残量を取得中（httpBaseAuth SigV4 execute-api）...'
        );
        const shadow = await getDeviceShadowViaHttpBaseAuth(endpoints, robotId, credentials);
        batteryLevel = shadow?.state?.reported?.batPct;
        if (batteryLevel != null) {
          return { batteryLevel, deviceName };
        }
      } catch (httpBaseAuthError) {
        console.warn(
          `httpBaseAuth SigV4経由での取得に失敗（次の方法を試みます）: ${httpBaseAuthError instanceof Error ? httpBaseAuthError.message : String(httpBaseAuthError)}`
        );
        if (DEBUG_LOG) {
          debugLog('httpBaseAuth SigV4エラー詳細:', httpBaseAuthError);
        }
      }
    } else if (DEBUG_LOG) {
      debugLog('httpBaseAuth SigV4スキップ:', {
        hasCredentials: !!credentials,
        hasHttpBaseAuth: !!endpoints.httpBaseAuth,
      });
    }

    // 試行3: IoTカスタム認証者経由（HTTP REST - フォールバック）
    // mqttAtsエンドポイントにx-amz-customauthorizer-*ヘッダーでアクセス
    if (iotToken && iotSignature && iotAuthorizerName) {
      try {
        console.log('Device Shadow経由でバッテリー残量を取得中（IoTカスタム認証者 HTTP）...');
        const shadow = await getDeviceShadowViaCustomAuth(
          endpoints,
          robotId,
          iotToken,
          iotSignature,
          iotAuthorizerName,
          iotClientId
        );
        batteryLevel = shadow?.state?.reported?.batPct;
        if (batteryLevel != null) {
          return { batteryLevel, deviceName };
        }
      } catch (customAuthError) {
        console.warn(
          `IoTカスタム認証者経由での取得に失敗（次の方法を試みます）: ${customAuthError instanceof Error ? customAuthError.message : String(customAuthError)}`
        );
        if (DEBUG_LOG) {
          debugLog('IoTカスタム認証者エラー詳細:', customAuthError);
        }
      }
    }

    // 試行4: AWS IoT直接アクセス（iotdata SigV4）
    if (credentials) {
      console.log('Device Shadow経由でバッテリー残量を取得中（AWS IoT SigV4）...');
      try {
        const shadow = await getDeviceShadowWithRetry(endpoints, robotId, credentials);
        batteryLevel = shadow?.state?.reported?.batPct;
      } catch (awsIotError) {
        // すべての方法が失敗した場合は警告を出して null を返す（認証エラーの可能性が高い）
        console.warn(
          `Device Shadow取得をすべての方法で試みましたが失敗しました（認証エラーまたは一時的な接続不可）: ${awsIotError instanceof Error ? awsIotError.message : String(awsIotError)}`
        );
        if (DEBUG_LOG) {
          debugLog('AWS IoT SigV4エラー詳細:', awsIotError);
        }
        return { batteryLevel: null, deviceName };
      }
    } else {
      console.warn('Device Shadowの取得に必要な認証情報がありません');
      return { batteryLevel: null, deviceName };
    }
  }

  if (batteryLevel === undefined || batteryLevel === null) {
    console.warn(`警告: ${deviceName} のバッテリー情報を取得できませんでした（全試行失敗）。`);
    return { batteryLevel: null, deviceName };
  }

  return { batteryLevel, deviceName };
}

// メイン処理
async function main() {
  if (LOCAL_ONLY) {
    console.log('Roombaバッテリー確認を開始します（ローカル検証モード）');
  } else {
    console.log('Roombaバッテリーチェックを開始します（Cloud API経由）');
  }

  let batteryLevel, deviceName;
  try {
    ({ batteryLevel, deviceName } = await getBatteryLevel());
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }

  // バッテリー情報が取得できなかった場合はスキップ
  if (batteryLevel === null) {
    console.log('バッテリーチェック完了（バッテリー情報取得失敗のためスキップ）');
    return;
  }

  console.log(`デバイス: ${deviceName}, バッテリー残量: ${batteryLevel}%`);

  if (LOCAL_ONLY) {
    console.log('ローカル検証モードのため、メール通知は送信しません');
    console.log('バッテリーチェック完了（ローカル検証モード）');
    return;
  }

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
