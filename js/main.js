/**
 * 【定数設定】
 */

// 画面ロードした日時を取得
const globalToday = new Date();
// 画面表示モード、表示文字列、ページ
var DISPLAY = {};
// ソート順
var SORTORDER = {
  asc: true,
  desc: false,
};
// ソートモード
var SORTMODE = {
  ANNIVERSARY: {
    code: 0,
    name: '記念日順',
    defaultSortOrder: SORTORDER.asc,
  },
  HISTORY: {
    code: 1,
    name: '時系列順',
    defaultSortOrder: SORTORDER.desc,
  },
};
// 設定ファイル情報
var appsettings = [];
// 全楽曲情報
var songsData = [];
// カラーセット
var colorSets = [];
//8/31か
var isMikuBirthday =
  globalToday.getMonth() === 7 && globalToday.getDate() === 31;

/**
 * 【イベント処理】
 */
// 1. 画面表示
$(document).ready(async function () {
  try {
    // スピナーを表示
    $('#spinner').show();

    // 1. 設定ファイル読み込み
    appsettings = await getJsonData('appsettings.json');

    // 2. 楽曲情報読み込み
    songsData = await fetchCsvData(
      appsettings.songsFileName,
      appsettings.songSkipRowCount
    );

    // 3. 画面表示モード、表示文字列、ページ
    DISPLAY = {
      MV: {
        mode: 0,
        name: 'MV',
        page: 1,
        data: songsData,
        sortCol: appsettings.MVReleaseDateCol,
        sortMode: SORTMODE.ANNIVERSARY.code,
        cardPerPage: appsettings.cardPerPageMV,
        generations: [
          ...new Set(
            songsData.map((row) =>
              row[appsettings.MVReleaseDateCol].slice(0, 4)
            )
          ),
        ].sort(),
      },
    };

    // 4. カラーセット
    colorSets = await fetchCsvData(
      appsettings.colorSetsFileName,
      appsettings.colorSkipRowCount
    );

    //6/4の場合
    if (isMikuBirthday) {
      // タイトル変更;
      $('#header').html(
        `みっくみくな <br />${globalToday.getFullYear() - 2007}th ANNIVERSARY!!`
      );
      //カラーを初音ミクに変更
      setLocal('colorIndex', 0);
    }

    // 開始画面を表示
    createDisplay(
      DISPLAY.MV.mode,
      1,
      SORTMODE.ANNIVERSARY.code,
      DISPLAY.MV.generations[0],
      DISPLAY.MV.generations[DISPLAY.MV.generations.length - 1]
    );
  } catch (error) {
    // エラーハンドリング
    showError('Failed to load data:', error);
  } finally {
    // 最後にスピナーを非表示
    $('#spinner').hide();
  }
});

// 画面タグ作成
function createDisplay(mode, page, sortMode, startYear, endYear) {
  // ページング、ソートモード保持
  for (let key in DISPLAY) {
    if (DISPLAY[key].mode === mode) {
      DISPLAY[key].page = page;
      DISPLAY[key].sortMode = sortMode;
      break;
    }
  }

  // スタイルシートを取得(背景画像設定用)
  const styleSheet = document.styleSheets[0];
  var cssRules = [];

  // 楽曲を日付順に並び変える
  var display = Object.values(DISPLAY).find((item) => item.mode === mode);
  var sortedData =
    sortMode === SORTMODE.ANNIVERSARY.code
      ? // 記念日順の場合 今日に近い未来の日付昇順
        sortByMonthDay(
          display.data,
          display.sortCol,
          SORTMODE.ANNIVERSARY.defaultSortOrder
        )
      : // 時系列順の場合 今日に近い未来の日付昇順
        sortByYearMonthDay(
          display.data,
          display.sortCol,
          SORTMODE.HISTORY.defaultSortOrder
        );
  //フィルター項目
  sortedData = sortedData.filter((song) => {
    // 年フィルター
    const releaseYear = song[appsettings.MVReleaseDateCol].slice(0, 4);
    const startYearTemp = startYear < endYear ? startYear : endYear;
    const endYearTemp = startYear < endYear ? endYear : startYear;
    return releaseYear >= startYearTemp && releaseYear <= endYearTemp;
  });

  // 表示開始/終了index
  var listStartIndex = display.cardPerPage * (display.page - 1);
  var listEndIndex = listStartIndex + display.cardPerPage;

  // タグクリア
  $('#display').empty();

  // 紙吹雪解除
  $('canvas')?.remove();

  // 変数初期化
  var tag = '';
  var leftDaysList = [];

  // 今日日付
  tag +=
    ' <p class="right-text date-text">TODAY：' +
    globalToday.toLocaleDateString('ja-JP').replace(/\./g, '/') +
    '</p>';

  // フィルター
  tag += ' <h2 class="h2-display">Filter</h2>';

  tag += ' <div class="year-select-container"> ';
  tag += ' <div class="year-select"> ';
  // 開始年
  tag += `   <select id="startYear" onchange="createDisplay(${DISPLAY.MV.mode}, 1, ${SORTMODE.ANNIVERSARY.code}, this.value, $('#endYear').val())"> `;
  display.generations.forEach(function (generation) {
    let selected =
      (!startYear && generation === display.generations[0]) ||
      (startYear && generation === startYear)
        ? 'selected'
        : '';
    tag += `<option value="${generation}" ${selected}>${generation}年</option>`;
  });
  tag += '   </select> ';
  tag += ' </div> ';
  // 終了年
  tag += ' <label class="year-select-label">～</label> ';
  tag += ' <div class="year-select"> ';
  tag += `   <select id="endYear" onchange="createDisplay(${DISPLAY.MV.mode}, 1, ${SORTMODE.ANNIVERSARY.code}, $('#startYear').val(), this.value)"> `;
  display.generations.forEach(function (generation) {
    let selected =
      (!endYear &&
        generation === display.generations[display.generations.length - 1]) ||
      (endYear && generation === endYear)
        ? 'selected'
        : '';
    tag += `<option value="${generation}" ${selected}>${generation}年</option>`;
  });
  tag += '   </select> ';
  tag += ' </div> ';
  tag += ' </div> ';
  tag += ' <h2 class="h2-display">Result</h2>';
  // ソート作成
  tag += createSortTag(display);

  // ページング作成
  tag += createPagingTag(display, sortedData);

  // タグ作成
  if (display.mode === DISPLAY.MV.mode) {
    //////////////////////////////////////////
    // MV情報
    //////////////////////////////////////////

    tag += '     <div class="card-list">';
    sortedData.slice(listStartIndex, listEndIndex).forEach(function (song) {
      // MV日付情報取得
      const MVReleaseDateStr = song[appsettings.MVReleaseDateCol];
      const mvLeftDays = getDaysToNextMonthDay(MVReleaseDateStr);
      leftDaysList.push(mvLeftDays);

      // アルバム画像名取得
      var imageName =
        song[appsettings.minialbumCol] !== appsettings.noDataString
          ? song[appsettings.minialbumCol]
          : song[appsettings.albumCol] !== appsettings.noDataString
          ? song[appsettings.albumCol]
          : appsettings.liveImageDefault;

      // 背景画像設定(ミニアルバム優先,すでにあるものは追加しない)
      cssRules = addCssRule(imageName, cssRules, appsettings.albumImagePath);

      // カード生成
      tag += '      <div class="card-item ' + imageName + '">';

      tag += createCardTitleTag(
        mvLeftDays,
        MVReleaseDateStr,
        song[appsettings.songNameCol],
        display.sortMode,
        '公開'
      );

      // MV Youtube表示
      tag += createMvTag(
        song[appsettings.mvIdCol],
        song[appsettings.mvSiteCol]
      );
      // ここまでMV Youtube

      // MV 情報
      tag +=
        '<div class="card-info-container">' +
        '<div class="card-info">作詞：' +
        song[appsettings.writerCol] +
        '<br>作曲：' +
        song[appsettings.composerCol] +
        '<br>編曲：' +
        song[appsettings.arrangerCol] +
        '<br>唄：' +
        song[appsettings.vocaloidCol] +
        '</div>';

      // // アルバム
      // tag += ' <div class="album-container">';
      // var album = song[appsettings.albumCol];
      // if (album !== appsettings.noDataString) {
      //   tag +=
      //     '<img src="' +
      //     appsettings.albumImagePath +
      //     album +
      //     '.jpg" alt="' +
      //     album +
      //     '"class="album album">';
      // }

      // // ミニアルバム
      // var minialbum = song[appsettings.minialbumCol];
      // if (minialbum !== appsettings.noDataString) {
      //   tag +=
      //     '<img src="' +
      //     appsettings.albumImagePath +
      //     minialbum +
      //     '.jpg" alt="' +
      //     minialbum +
      //     '" class="album album">';
      // }
      // tag += '        </div>'; //album-container
      tag += '        </div>'; //card-info-container

      tag +=
        '<div class="card-url"><a href="' +
        (song[appsettings.mvSiteCol].startsWith('ニコニコ')
          ? appsettings.mvUrlBaseNicoNico
          : appsettings.mvUrlBaseYoutube) +
        song[appsettings.mvIdCol] +
        '" target="_blank" rel="noopener noreferrer">' +
        (song[appsettings.mvSiteCol].startsWith('ニコニコ')
          ? 'ニコニコ動画'
          : 'Youtube') +
        'で見る<i class="fas fa-arrow-up-right-from-square"></i></a></div>';

      // MV公開年月日
      tag += '           <div class="card-date">' + MVReleaseDateStr + '</div>';

      tag += '        </div>'; //card-item
    });
    tag += '         </div>'; //card-list
    // 敬称略
    tag += '<div class="right-text">※敬称略です</div>';
  }

  // ページング作成
  tag += createPagingTag(display, sortedData);

  // カラーチェンジ
  tag +=
    ' <h2 id="changeColor" class="center-text margin-top-20" style="cursor: pointer;" onclick="changeColor(1)">Color ↺</h2>';

  // サイト情報
  tag += ' <footer style="text-align: center; margin-top: 2rem;">';
  tag +=
    '   <a href="about.html" target="_blank" rel="noopener noreferrer">サイト情報</a>';
  tag += ' </footer>';

  // タグ流し込み
  $('#display').append(tag);

  // 紙吹雪
  if (isMikuBirthday) {
    // 6月4日限定の紙吹雪
    $('#confetti').prepend('<canvas id="canvas"></canvas>');
    dispConfettifor0604();
  } else if (leftDaysList.includes(0)) {
    // 記念日のものがある場合
    $('#confetti').prepend('<canvas id="canvas"></canvas>');
    dispConfetti();
  }

  // CSS適用
  changeColor(0);

  // 背景画像のcss設定
  cssRules.forEach((rule) =>
    styleSheet.insertRule(rule, styleSheet.cssRules.length)
  );

  // 画像拡大設定
  addEnlargeImageEvent();
}
