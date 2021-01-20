// グローバル変数
// スキャン状況把握のための変数
var LEscanobject;
// スキャン状況を記録する変数
var terminal_rssi   = [];     // 端末の検知結果を記録する変数
var terminal_count  = [];     // 端末を検知した回数を記録する変数
// 検知条件を記録する変数
var detect_criteria  = -120;   // 端末の判定条件になるRSSI平均値を格納
var detect_threshold = 5;      // detect_criteriaをどの程度上回れば検知と見なすかの閾値
var running_detection = false; // 検知を実施中か否か
// 起動時のパフォーマンス測定の設定
const perfomance_check_seconds  = 5; // 時間(秒)
var   perfomance_check_criteria = 5; // 回/測定時間
// 検知条件算出時間(端末を話した状態でのRSSIを収集する秒数)
var   threshold_calculation_seconds = 4; // 秒
// デバッグ用ウインドウの表示/非表示切り替え
var debug_mode = false;

// UI関連
// 画面を切り替える関数
function change_window(target_type) {
  // 画面切り替え用の配列
  var windows_handle = [
    document.getElementById("1_1"), // 0
    document.getElementById("2_1"), // 1
    document.getElementById("2_2"), // 2
    document.getElementById("3_2"), // 3
    document.getElementById("8_1"), // 4
    document.getElementById("4_1"), // 5
    document.getElementById("5_1"), // 6
    document.getElementById("6_1"), // 7
    document.getElementById("7_1"), // 8
    document.getElementById("7_2"), // 9
    document.getElementById("9_1"), // 10
    document.getElementById("10_1") // 11
  ];
  // いったん全部隠す
  for (var i=0; i<windows_handle.length; i++) {
    windows_handle[i].style.visibility = 'hidden';
  }
  // typeに応じて戻る画面を選ぶ
  switch (target_type) {
    case "operator":                windows_handle[0].style.visibility  = 'visible'; break;
    case "boot_fail":               windows_handle[1].style.visibility  = 'visible'; break;
    case "boot_retry":              windows_handle[2].style.visibility  = 'visible'; break;
    case "perfomance_checking":     windows_handle[3].style.visibility  = 'visible'; break;
    case "faq_operator":            windows_handle[4].style.visibility  = 'visible'; break;
    case "enduser":                 windows_handle[5].style.visibility  = 'visible'; break;
    case "waiting_detect_criteria": windows_handle[6].style.visibility  = 'visible'; break;
    case "starting_detection":      windows_handle[7].style.visibility  = 'visible'; break;
    case "detect_succeed":          windows_handle[8].style.visibility  = 'visible'; break;
    case "detect_failed" :          windows_handle[9].style.visibility  = 'visible'; break;
    case "faq_enduser":             windows_handle[10].style.visibility = 'visible'; break;
    case "notice":                  windows_handle[11].style.visibility = 'visible'; break;
    default:
      // デバッグ用の画面番号指定
      windows_handle[target_type].style.visibility = 'visible';
  }
}

// ご利用にあたって へ遷移したり遷移元に戻ったりする
var prev_window_notice = 0;
function notice_window_toggle(target) {
  if (target != '') {
    // ご利用にあたって　を呼び出した画面を記憶して
    prev_window_notice = target;
    // ご利用にあたって　を表示する
    change_window('notice');
  } else {
    // ご利用にあたって　を表示する元の画面にもどす
    change_window(prev_window_notice);
  }
}

// よくあるご質問 へ遷移したり戻ったりする
var prev_window_help = 0;
function help_window_toggle(target) {
  if (target != '') {
    // ご利用にあたって　を呼び出した画面を記憶して
    prev_window_help = target;
    // ご利用にあたって　を表示する
    change_window('faq_operator');
  } else {
    // ご利用にあたって　を表示する元の画面にもどす
    change_window(prev_window_help);
  }
}

// FAQ へ遷移したり戻ったりする
var prev_window_faq = 0;
function faq_window_toggle(target) {
  if (target != '') {
    // ご利用にあたって　を呼び出した画面を記憶して
    prev_window_faq = target;
    // ご利用にあたって　を表示する
    change_window('faq_enduser');
  } else {
    // ご利用にあたって　を表示する元の画面にもどす
    change_window(prev_window_faq);
  }
}

// アコーディオン表示の開閉
function toggle_accordion(target) {
  var target_accordion = document.getElementById(target+'_header');
  var target_content = document.getElementById(target+'_content');

  if( target_content.style.display == 'none') {
    target_content.style.display = 'block';
    target_accordion.style.borderBottomRightRadius = '0px';
    target_accordion.style.borderBottomLeftRadius = '0px';
  } else {
    target_content.style.display = 'none';
    target_accordion.style.borderBottomRightRadius = '10px';
    target_accordion.style.borderBottomLeftRadius = '10px';
  }
}

// UI確認用の画面切り替え関数（デバッグ用）
var windows_visible = 0;
function toggle_visible() {
  // 画面番号をインクリメントする
  if (windows_visible < 10) {
    windows_visible++;
  } else {
    windows_visible = 0;
  }
  // 画面が 2_2 (2番) なら、Q&Aのアコーディオンを全部開く
  if (windows_visible == 2) {
    document.getElementById("reason_1_header").style.display = 'flex';
    document.getElementById("reason_2_header").style.display = 'flex';
    document.getElementById("reason_3_header").style.display = 'flex';
    document.getElementById("reason_4_header").style.display = 'flex';
    document.getElementById("reason_5_header").style.display = 'flex';
    document.getElementById("reason_6_header").style.display = 'flex';
  }
  change_window(windows_visible);
}

// スキャン全般関連
// スキャン時のリスナー
function found_terminal(event) {
  // 現在時刻の取得
  var nowtime = new Date();
  var nowtimestring = nowtime.toLocaleTimeString('ja-JP');
  var timenumber = nowtime.getSeconds();

  // terminal_countの回数を増やす
  if ( terminal_count[timenumber] ) {
    // 変数があれば1増やす
    terminal_count[timenumber]++;
  } else {
    // 変数がなかったら1とする
    terminal_count[timenumber] = 1;
  }

  // terminal_rssiに計測結果を投入する
  // その時刻(秒)の計測結果投入がはじめてなら、連想配列を生成する
  if ( !terminal_rssi[timenumber] ) {
    terminal_rssi[timenumber] = {};
  }
  // event.device.idの値の有無を確認する
  if ( !terminal_rssi[timenumber][event.device.id] ) {
    // 存在しない = 初発見なら、最初の値を入れる
    terminal_rssi[timenumber][event.device.id] = {raw_value: [event.rssi]};
  } else {
    // 存在するなら、値を修正する
    terminal_rssi[timenumber][event.device.id].raw_value.push(event.rssi);
  }

  // 判定しなさいフラグが立っていたら判定処理を動かす
  if (running_detection) {
    device_detection(event.rssi);
  }
}

// スキャン中にフォーカスが外れるなどしてスキャンが止まったのを検知する関数
var scan_running_checker;
var return_top_when_scan_stopped = false; // スキャン停止時にトップに戻すかどうか
function check_scan_running() {
  // 測定結果を記録した変数を定期的に空にする
    // 変数の中身を空にするルーチン
    function func_assoc_array(num) {
      // ログの中身があり
      if ( terminal_rssi[num] ) {
        // 中身が空っぽでなければ、
        if ( Object.keys(terminal_rssi[num]).length > 0) {
          // 空にするとともに
          terminal_rssi[num] = {};
          // カウント回数もゼロにする
          terminal_count[num] = 0;
        }
      }
    }
  // 現在時刻の取得
  var nowtime = new Date();
  // 2秒先の時刻を得て、変数の中身を空にする
  nowtime.setSeconds(nowtime.getSeconds() + 2);
  func_assoc_array(nowtime.getSeconds());
  // さらに1秒先の時刻を得て、変数の中身を空にする
  nowtime.setSeconds(nowtime.getSeconds() + 1);
  func_assoc_array(nowtime.getSeconds());
  // さらに1秒先の時刻を得て、変数の中身を空にする
  nowtime.setSeconds(nowtime.getSeconds() + 1);
  func_assoc_array(nowtime.getSeconds());

  // 画面5-1で表示する「周囲のCOCOA台数」を計算して表示するルーチン
    // 配列の重複を無くす関数
    function uniq(array) {
      return array.filter((elem, index, self) => self.indexOf(elem) === index);
    }
  var cocoatime = new Date();
  var device_id_list = [];
  for (i=0; i<10; i++) {
    if (terminal_rssi[cocoatime.getSeconds()]) {
      Array.prototype.push.apply(device_id_list,Object.keys(terminal_rssi[cocoatime.getSeconds()]));
    }
    cocoatime.setSeconds(cocoatime.getSeconds()-1);
  }
  document.getElementById("present_device_number").innerText = uniq(device_id_list).length;

  // デバッグモードのときの処理
    // デバッグ情報表示をする作業の共通部分
    function debug_mode_output(target_num) {
      if (terminal_count[debugtime.getSeconds()]) {
        document.getElementById("debug_terminal_count"+target_num).value = terminal_count[debugtime.getSeconds()];
      } else {
        document.getElementById("debug_terminal_count"+target_num).value = '0';
      }
      if (terminal_rssi[debugtime.getSeconds()]) {
        var id_rssi = [];
        var all_rssi = [];
        Object.keys(terminal_rssi[debugtime.getSeconds()]).forEach(function (key) {
          id_rssi = [];
          for(var j=0; j<terminal_rssi[debugtime.getSeconds()][key].raw_value.length; j++) {
            id_rssi.push(terminal_rssi[debugtime.getSeconds()][key].raw_value[j]);
          }
          all_rssi.push('[' + id_rssi.join(',') + ']');
        });
        document.getElementById("debug_terminal_rssi"+target_num).value = all_rssi.join(',');
      } else {
        document.getElementById("debug_terminal_rssi"+target_num).value = '[]';
      }
    }
  // デバッグモードの時には
  if (debug_mode) {
    var debugtime = new Date();
    debugtime.setSeconds(debugtime.getSeconds() - 1);
    debug_mode_output('1');
    debugtime.setSeconds(debugtime.getSeconds() - 1);
    debug_mode_output('2');
    debugtime.setSeconds(debugtime.getSeconds() - 1);
    debug_mode_output('3');
  }

  // スキャン停止時にトップに戻すモードの場合は
  if ( return_top_when_scan_stopped ) {
    // スキャン中にスキャンが止まったら
    if ( !(LEscanobject.active) ) {
      // 問答無用で起動画面に戻す
      change_window('operator');
      clearInterval(scan_running_checker);
    }
  }
}

// 動作チェック関連
// 動作環境テスト(パフォーマンス測定以外)
async function check_enviroment(){
  // 動画を再生して画面Offを抑止する
  var v = document.getElementById('video');
  v.play();

  // Androidかどうかを確認
  if (navigator.userAgent.indexOf("Android") == -1){
    change_window("boot_fail");
    return;
  }

  // window_retry(画面2_2)のエラー内容を一旦全部非表示にする
    // 非表示に変えつつアコーディオン表示の中身も閉じる作業
    function close_accordion(target) {
      var target_accordion = document.getElementById(target+'_header');
      var target_content = document.getElementById(target+'_content');
      target_accordion.style.display = 'none';
      target_accordion.style.borderBottomRightRadius = '10px';
      target_accordion.style.borderBottomLeftRadius = '10px';
      target_content.style.display = 'none';
    }
  // 1～6を全部閉じる
  for(var i=1; i<7; i++) {
    close_accordion("reason_"+i);
  }

  // Androidのバージョンを確認
  if ( parseFloat(navigator.userAgent.slice(navigator.userAgent.indexOf("Android")+8)) < 6 ) {
    change_window("boot_retry");
    document.getElementById("reason_1_header").style.display = 'flex';
    return;
  }

  // Chromeで起動しているかどうかを確認
  if (navigator.userAgent.indexOf("Chrome") == -1 || navigator.userAgent.indexOf("Edge") !== -1){
    change_window("boot_retry");
    document.getElementById("reason_2_header").style.display = 'flex';
    return;
  } else {
    // Chromeのバージョンを確認　(85以降)
    if (parseFloat(navigator.userAgent.slice(navigator.userAgent.indexOf("Chrome")+7)) < 84) {
      change_window("boot_retry");
      document.getElementById("reason_2_header").style.display = 'flex';
      return;
    }
  }

  // #enable-experimental-web-platform-featuresの確認
  // 念のため、Bluetooth関連APIの利用可否を確認してからフラグを確認
  navigator.bluetooth.getAvailability().then(available => {
    if (available) {
      // FlagsでScanningが有効になっているか確認
      if ('requestLEScan' in navigator.bluetooth === false) {
        change_window("boot_retry");
        document.getElementById("reason_3_header").style.display = 'flex';
        return;
      }
    } else {
      // もしBluetoothが使えなければ、Chromeをアップデートさせる
      change_window("boot_retry");
      document.getElementById("reason_2_header").style.display = 'flex';
      return;
    }
  });

  // BLE scanningが走るかの確認
  try{
    // スキャンを走らせる
    LEscanobject = await navigator.bluetooth.requestLEScan({filters: [{ services: [0xFD6F]}]});
    // 走ったらリスナーを設定する
    navigator.bluetooth.addEventListener('advertisementreceived', found_terminal );
    // 3_2(パフォーマンス測定)画面を開く
    change_window("perfomance_checking");
    // デバッグ用ウインドウ表示時には
    if (debug_mode) {
      // 現在時刻をデバッグ欄に表示し
      var nowtime = new Date();
      document.getElementById("debug_performance_check_start_time").value = nowtime.getSeconds();
    }
    // スキャン停止時にトップに戻さない設定で
    return_top_when_scan_stopped = false;
    // スキャン稼働チェックを回しつつ
    scan_running_checker = setInterval(check_scan_running,1000);
    // パフォーマンス測定を5秒間回す
    perfomance_checker = setTimeout(perfomance_check,1000 * perfomance_check_seconds);
  } catch (error) {
    if (error.name == 'InvalidStateError') {
      // スキャンがキャンセルされたら、画面 1_1 に戻す
      change_window("operator");
      return;
    } else if (error.name == 'NotAllowedError') {
      // スキャンが禁止されている
      change_window("boot_retry");
      document.getElementById("reason_4_header").style.display = 'flex';
      return;
    } else if (error.name == 'NotFoundError') {
      // BluetoothがOffになっているか、Chromeの位置情報利用が許可されていない
      change_window("boot_retry");
      document.getElementById("reason_5_header").style.display = 'flex';
      return;
    }
  }
}

// トラブルシューティング: クリップボードに特権URLを格納した上でウインドウを開く
function open_new_tab_with_privileged_url() {
  // クリップボードにURLを貼り付けるテスト
  var elem = document.getElementById("privileged_url");
  elem.select();
  document.execCommand("Copy");
  window.open();
}

// パフォーマンス測定
var perfomance_checker;
function perfomance_check() {
  // パフォーマンス(Bluetoothのスキャンが秒速何件行えるか)を測定
  // 現在時刻を得て
  var nowtime = new Date();
  // perfomance_check_seconds秒前から現在までの測定回数を得る
  var perfomance_count = 0;
  for(var s=0; s < perfomance_check_seconds; s++) {
    // 変数が定義されていたら加算する
    if(terminal_count[nowtime.getSeconds()]) {
      perfomance_count += terminal_count[nowtime.getSeconds()];
    }
    nowtime.setSeconds(nowtime.getSeconds() - 1);
  }

  // デバッグ用ウインドウ表示時には
  if (debug_mode) {
    // デバッグ用情報を表示し
    document.getElementById("debug_performance_result").value = perfomance_count;
    // 現在時刻をデバッグ欄に表示し
    nowtime.setSeconds(nowtime.getSeconds() + 5);
    document.getElementById("debug_performance_check_end_time").value = nowtime.getSeconds();
    // デバッグ条件を反映する
    if ( parseInt(document.getElementById("debug_performance_criteria").value, 10) ) {
      perfomance_check_criteria = parseInt(document.getElementById("debug_performance_criteria").value, 10);
    }
  }

  // 測定結果を判定
  if ( perfomance_count < perfomance_check_criteria) {
    // Bluetoothのスキャン頻度が不足していたら、
    // パフォーマンス不足を伝えるエラー画面を開く
    change_window("boot_retry");
    document.getElementById("reason_6_header").style.display = 'flex';
  } else {
    // Bluetoothのスキャン頻度が一定以上ならば、
    // スキャン停止時にトップに戻すモードに切り替え
    return_top_when_scan_stopped = true;
    // パフォーマンス測定画面を閉じて利用者画面を開く
    change_window("enduser");
  }
}

// 検知関連
// 検知条件を算出するタイマーを仕掛ける
function set_detect_timer() {
  // 画面を切り替える
  change_window("waiting_detect_criteria");
  // アニメーションを起動する
  //document.getElementById("frame_hand_prepare").style.animationPlayState = 'running';
  // 検知条件の算出をする関数をタイマーで仕掛ける
  // 2秒余分にするのは、端末からスマホを離して貰う時間確保のため
  setTimeout(threshold_calculation, (threshold_calculation_seconds + 2) * 1000);
}

// 検知条件の算出
function threshold_calculation() {
  // 直近3秒の計測結果から、検知条件を判定する
  // 検知条件の初期値は-120dB
  detect_criteria = -120;

  // 特定の秒におけるRSSIの最大値を取得する関数
    function get_max_rssi(time_number, prev_max) {
      if (terminal_rssi[time_number]) {
        var max_rssi = prev_max;
        Object.keys(terminal_rssi[time_number]).forEach(function (key) {
          for(var j=0; j<terminal_rssi[time_number][key].raw_value.length; j++) {
            if (max_rssi < terminal_rssi[time_number][key].raw_value[j]) {
              max_rssi = terminal_rssi[time_number][key].raw_value[j];
            }
          }
        });
        return max_rssi;
      } else {
        return prev_max;
      }
    }

  // 現在時刻の取得
  var nowtime = new Date();
  // 現在の時刻のRSSIの最大値と比較し、大きいものを残す
  detect_criteria = get_max_rssi(nowtime.getSeconds(), detect_criteria);
  // 検知条件算出時間(threshold_calculation_seconds)から2引いた回数だけ遡る
  for (var i=0; i<(threshold_calculation_seconds-2); i++) {
    // 時刻を1秒前戻し、その時刻のRSSIの最大値と比較し、大きいものを残す
    nowtime.setSeconds(nowtime.getSeconds() - 1);
    detect_criteria = get_max_rssi(nowtime.getSeconds(), detect_criteria);
  }

  // アニメーションをとめて
  //document.getElementById("frame_hand_prepare").style.animationPlayState = 'paused';
  // 画面を切り替えて
  change_window("starting_detection");

  // スマホをかざすアニメーションを有効にして
  document.getElementById("frame_hand_detect").classList.toggle('active');
  // スマホをかざすアニメーションを1回したら止めるイベントリスナーを1回起動で仕込んで
  document.getElementById("frame_hand_detect").addEventListener('animationiteration', () => {
    document.getElementById("frame_hand_detect").style.animationPlayState = 'paused';
    document.getElementById("frame_hand_detect").classList.toggle('active');
  }, {once: true});

  // アニメーションを起動する
  document.getElementById("frame_hand_detect").style.animationPlayState = 'running';
  // 判定しなさいフラグを立てて
  running_detection = true;
  // タイムアウト時の処理をするタイマーをセットする
  timeout_checker = setTimeout(detect_timeout, 15000);

  // デバッグモードの時には
  if (debug_mode) {
    // デバッグ条件を反映し
    if ( parseInt(document.getElementById("debug_detect_threshold").value, 10) ) {
      detect_threshold = parseInt(document.getElementById("debug_detect_threshold").value, 10);
    }
    // 現在時刻をデバッグ欄に表示し
    nowtime.setSeconds(nowtime.getSeconds() + 3);
    document.getElementById("debug_detect_start_time").value = nowtime.getSeconds();
    // 判定条件を表示する
    document.getElementById("debug_detect_criteria").value = detect_criteria;
  }
}

// 接近判定
function device_detection(rssi_score) {
  // 判定条件と比較して当該スコアが閾値以上に高ければ
  if ( rssi_score > detect_criteria + detect_threshold ) {
    // 判定しなさいフラグを下ろし
    running_detection = false;
    // タイムアウト処理も解除して
    clearTimeout(timeout_checker);
    // アニメーションをとめて
    document.getElementById("frame_hand_detect").style.animationPlayState = 'paused';
    // 計測成功画面に変更する
    change_window("detect_succeed");
    // デバッグ用ウインドウ表示時には
    if (debug_mode) {
      // 現在時刻をデバッグ欄に表示
      var nowtime = new Date();
      document.getElementById("debug_detect_found_time").value = nowtime.getSeconds();
    }
  }
}

// タイムアウト時の処理をする
var timeout_checker;
function detect_timeout() {
  // 判定しなさいフラグが立っていたら
  if (running_detection) {
    // 判定しなさいフラグを下ろして
    running_detection = false;
    // アニメーションをとめて
    document.getElementById("frame_hand_detect").style.animationPlayState = 'paused';
    // 画面を失敗画面に切り替える
    change_window("detect_failed");
  }
}

// デバッグ関連
// デバッグ用のシェア出力
async function sendDebugLog(){
    // デバッグ出力を作成する
    var content = "";
    // 端末名などを
    content += 'モデル名\t' + navigator.appVersion.split(/[()]/)[1].split(';')[2] + '\n';
    content += 'Platform\t' + navigator.platform + '\n';
    content += 'Android Version\t' + parseFloat(navigator.userAgent.slice(navigator.userAgent.indexOf("Android")+8)) + '\n';
    content += 'Chrome Version\t' + parseFloat(navigator.userAgent.slice(navigator.userAgent.indexOf("Chrome")+7)) + '\n';
    content += 'スクリーン幅\t' + screen.width + '\n';
    content += 'スクリーンの高さ\t' + screen.height + '\n';
    content += 'ブラウザのビューポートの幅\t' + window.innerWidth + '\n';
    content += 'ブラウザのビューポートの高さ\t' + window.innerHeight + '\n';
    // 主要な設定値と判定値、時刻
    content += '性能評価時間(sec)\t' + perfomance_check_seconds + '\n';
    content += '性能評価条件(回/sec)\t' + perfomance_check_criteria + '\n';
    content += '性能評価開始時刻(秒)\t' + document.getElementById("debug_performance_check_start_time").value + '\n';
    content += '性能評価終了時刻(秒)\t' + document.getElementById("debug_performance_check_end_time").value + '\n';
    content += '判定基準値(dB)\t' + detect_criteria + '\n';
    content += '判定閾値(dB)\t' + detect_threshold + '\n';
    content += '判定開始時刻(秒)\t' + document.getElementById("debug_detect_start_time").value + '\n';
    content += '判定終了時刻(秒)\t' + document.getElementById("debug_detect_found_time").value + '\n';
    content += '\n';
    // terminal_count(タブ区切り加工)
    content += 'terminal_count\n';
    content += '\n';
    content += 'time_number\tterminal_count\n';
    for(var i=0; i<60; i++) {
      content += i + '\t' + terminal_count[i] + '\n';
    }
    content += '\n';
    // terminal_rssi(タブ区切り加工)
    content += 'terminal_rssi (tsv)\n';
    content += '\n';
    content += 'time_number\tdevice_id\tvalue_type\tvalue\n';
    for(var i=0; i<60; i++) {
      if ( terminal_rssi[i] ) {
        Object.keys(terminal_rssi[i]).forEach(function (key) {
          for(var j=0; j<terminal_rssi[i][key].raw_value.length; j++) {
            content += i + '\t' + key + '\t' + 'raw_value' + '\t' + terminal_rssi[i][key].raw_value[j] + '\n';
          }
        });
      }
    }
    content += '\n';
    // terminal_rssi(JSON形式生出力)
    /*
    content += 'terminal_rssi (raw)\n';
    content += '\n';
    content += JSON.stringify(terminal_rssi,null,2);
     */

    // 出力したログをファイルに加工する
    const encoder = new TextEncoder();
    var blob = encoder.encode(content);
    var resultfile = new File([blob.buffer], 'COCOA-signal-confirmer.txt', {type: 'text/plain'})

    // ブラウザのシェア機能を使って送信する
    navigator.share({
      files: [resultfile]
    }).then(() => {
      document.getElementById('debug_sendlog').value = 'ファイル送信成功';
    }).catch((error) => {
      document.getElementById('debug_sendlog').value = 'ファイル送信失敗';
    })
}
