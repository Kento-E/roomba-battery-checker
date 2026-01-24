// .envファイルから環境変数を読み込み
require('dotenv').config();

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
if (ROOMBA_IP && ROOMBA_IP.trim() !== '') {
  // 各オクテットが0-255の範囲内にあることを検証
  const octet = '(25[0-5]|2[0-4]\\d|1?\\d?\\d)';
  const ipPattern = new RegExp(`^${octet}\\.${octet}\\.${octet}\\.${octet}$`);
  if (!ipPattern.test(ROOMBA_IP.trim())) {
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
  // 空文字列や空白のみの値は「未設定」とみなし、自動検出にフォールバックする
  if (ROOMBA_IP && ROOMBA_IP.trim() !== '') {
    console.log(`指定されたIPアドレスを使用: ${ROOMBA_IP.trim()}`);
    return ROOMBA_IP.trim();
  }

  console.log('Roombaを自動検出中...');
  return new Promise((resolve, reject) => {
    let completed = false;
    
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error('Roombaの自動検出がタイムアウトしました。ROOMBA_IP環境変数を設定してください。'));
      }
    }, 10000); // 10秒でタイムアウト

    dorita980.getRobotIP((error, ip) => {
      if (completed) return; // タイムアウト後の応答は無視
      
      completed = true;
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
  
  console.log(`\nRoombaへの接続を開始します...`);
  console.log(`  BLID: ${BLID}`);
  console.log(`  IP: ${roombaIP}`);
  console.log(`  PASSWORD: ${PASSWORD ? '(設定済み)' : '(未設定)'}`);
  
  const robot = new dorita980.Local(BLID, PASSWORD, roombaIP);
  
  console.log('✓ dorita980.Localインスタンスを作成しました');
  console.log('MQTT接続を待機中...');

  // 接続タイムアウト（60秒）
  const connectTimeout = setTimeout(() => {
    console.error('\n✗ エラー: Roombaへの接続がタイムアウトしました（60秒）');
    console.error('考えられる原因:');
    console.error('  1. RoombaがWi-Fiネットワークに接続されていない');
    console.error('  2. IPアドレスが正しくない');
    console.error('  3. BLIDまたはパスワードが正しくない');
    console.error('  4. Roombaのファームウェアが対応していない');
    process.exit(1);
  }, 60000);

  // エラーイベントのリスナー
  robot.on('error', (error) => {
    clearTimeout(connectTimeout);
    console.error('\n✗ Roomba接続エラー:', error.message);
    console.error('詳細:', error);
    process.exit(1);
  });

  // オフラインイベントのリスナー
  robot.on('offline', () => {
    console.log('\n⚠ Roombaがオフラインになりました');
  });

  // クローズイベントのリスナー
  robot.on('close', () => {
    console.log('\n⚠ Roomba接続が切断されました');
  });

  robot.on('connect', async () => {
    try {
      clearTimeout(connectTimeout); // 接続タイムアウトをクリア
      console.log('\n✓✓ Roomba接続成功！');
      console.log('Roomba状態を取得中...');
      console.log('デバッグ: MQTT接続が確立されました。状態更新を待機しています...');
      
      // MQTTメッセージを受信してバッテリー状態を取得
      // on('state')イベントでリアルタイムに状態を監視
      const batteryInfo = await new Promise((resolve, reject) => {
        let batteryLevel = null;
        let deviceName = 'Roomba';
        let timeoutId;
        let resolved = false; // Promiseが解決済みかを追跡
        let stateUpdateCount = 0; // 受信した状態更新の回数
        let fullStateReceived = false; // 完全な状態を一度だけログ出力
        
        const stateHandler = (state) => {
          if (resolved) return; // 既に解決済みの場合は何もしない
          
          stateUpdateCount++;
          console.log(`\n===== 状態更新 #${stateUpdateCount} =====`);
          console.log('受信フィールド:', Object.keys(state).join(', '));
          
          // 完全な状態を一度だけJSON形式でログ出力（デバッグ用）
          // 注: capフィールドのみの初期状態（通常1-3フィールド）をスキップし、
          // より多くの情報を含む状態更新（通常5+フィールド）を表示
          if (!fullStateReceived && Object.keys(state).length > 5) {
            fullStateReceived = true;
            console.log('\n【完全な状態オブジェクト（JSON形式）】:');
            console.log(JSON.stringify(state, null, 2));
            console.log('【完全な状態オブジェクト（終了）】\n');
          }
          
          // デバッグ用：受信した状態の一部を詳細表示
          if (state.batPct != null) {
            console.log('✓ batPct:', state.batPct);
          } else {
            console.log('✗ batPct: 未受信');
          }
          
          if (state.name) {
            console.log('✓ name:', state.name);
          }
          
          if (state.cleanMissionStatus) {
            console.log('✓ cleanMissionStatus:', JSON.stringify(state.cleanMissionStatus));
          }
          
          // バッテリー情報が含まれている場合
          if (state.batPct != null) {
            batteryLevel = state.batPct;
            console.log(`\n✓✓ バッテリー残量を取得: ${batteryLevel}%`);
          }
          
          // デバイス名が含まれている場合
          if (state.name) {
            deviceName = state.name;
          }
          
          // バッテリー情報が取得できたら解決
          if (batteryLevel != null) {
            resolved = true; // 解決済みフラグを設定
            clearTimeout(timeoutId);
            robot.removeListener('state', stateHandler);
            console.log('===========================\n');
            resolve({ batteryLevel, deviceName });
          } else {
            console.log('→ batPctが含まれていないため、次の状態更新を待機します...');
            console.log('===========================\n');
          }
        };
        
        // タイムアウト設定（30秒）
        timeoutId = setTimeout(() => {
          if (resolved) return; // 既に解決済みの場合は何もしない
          resolved = true; // 解決済みフラグを設定
          robot.removeListener('state', stateHandler);
          console.error(`\n✗ タイムアウト: ${stateUpdateCount}回の状態更新を受信しましたが、batPctフィールドが含まれていませんでした。`);
          reject(new Error('バッテリー状態の取得がタイムアウトしました（30秒）'));
        }, 30000);
        
        // 状態更新イベントをリッスン
        robot.on('state', stateHandler);
      });
      
      const { batteryLevel, deviceName } = batteryInfo;
      
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
