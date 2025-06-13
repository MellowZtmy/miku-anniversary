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
        vocaloids: [
          'すべて',
          ...Array.from(
            new Set(
              songsData.flatMap(
                (row) =>
                  row[appsettings.vocaloidCol]
                    ?.split('・')
                    .map((v) => v.trim()) || []
              )
            )
          ).sort(),
        ],
        composers: [
          'すべて',
          ...Array.from(
            new Set(songsData.map((row) => row[appsettings.composerCol]))
          ).sort(),
        ],
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
      DISPLAY.MV.generations[DISPLAY.MV.generations.length - 1],
      DISPLAY.MV.vocaloids[0],
      DISPLAY.MV.composers[0]
    );
  } catch (error) {
    // エラーハンドリング
    showError('Failed to ready:', error);
  } finally {
    // 最後にスピナーを非表示
    $('#spinner').hide();
  }
});

// 画面タグ作成
function createDisplay(
  mode,
  page,
  sortMode,
  startYear,
  endYear,
  vocaloid,
  composer
) {
  try {
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
    // フィルター項目
    sortedData = sortedData.filter((song) => {
      const releaseYear = parseInt(
        song[appsettings.MVReleaseDateCol].slice(0, 4),
        10
      );

      // 年フィルターの範囲を正規化
      const [minYear, maxYear] = [startYear, endYear].sort((a, b) => a - b);

      // 各フィルターの結果を変数に格納
      const passesVocaloidFilter =
        vocaloid === 'すべて' ||
        song[appsettings.vocaloidCol]
          .split('・')
          .map((v) => v.trim())
          .includes(vocaloid);

      const passesComposerFilter =
        composer === 'すべて' ||
        song[appsettings.composerCol] === composer ||
        song[appsettings.composerCol].includes(composer);

      const passesYearFilter = releaseYear >= minYear && releaseYear <= maxYear;

      // すべてのフィルターをAND条件で結合
      return passesVocaloidFilter && passesComposerFilter && passesYearFilter;
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

    // 年フィルター作成
    tag += createYearFilter(display.generations, startYear, endYear);

    // ボーカロイドフィルター作成
    tag += createVocaloidFilter(display.vocaloids, vocaloid);

    // ボカロPフィルター作成
    tag += createComposerFilter(display.composers, composer);

    // クリアボタン
    tag += ' <div class="quiz-mode-container">';
    tag += `   <input type="button" id="clear" name="quizMode" value="clear" hidden onclick="createDisplay(DISPLAY.MV.mode,1,SORTMODE.ANNIVERSARY.code,
                                                                          DISPLAY.MV.generations[0],DISPLAY.MV.generations[DISPLAY.MV.generations.length - 1],
                                                                          DISPLAY.MV.vocaloids[0],DISPLAY.MV.composers[0]);">`;
    tag +=
      '   <label id="clearLabel" for="clear" class="quizModeRadio">クリア</label>';
    tag += ' </div>';

    tag += ' <h2 class="h2-display">Result</h2>';
    // ソート作成
    tag += createSortTag(display, sortedData);

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
          song[appsettings.youtubeMvIdCol],
          song[appsettings.mvSiteCol]
        );
        // ここまでMV Youtube

        // ひとこと
        tag += '<div class="card-catchphrase-band">―';
        tag += 'サンプルひとこと';
        tag += '</div>';

        // MV 情報
        tag +=
          '<div class="card-info-container">' +
          '<div class="card-info">作詞：' +
          song[appsettings.writerCol] +
          '<br>作曲：' +
          song[appsettings.composerCol] +
          '<br>編曲：' +
          song[appsettings.arrangerCol] +
          '<br>歌：' +
          song[appsettings.vocaloidCol] +
          '</div>';

        tag += '        </div>'; //card-info-container

        tag +=
          '<div class="card-url"><a href="' +
          (song[appsettings.mvIdCol] !== appsettings.noDataString
            ? appsettings.mvUrlBaseNicoNico + song[appsettings.mvIdCol]
            : appsettings.mvUrlBaseYoutube + song[appsettings.youtubeMvIdCol]) +
          '" target="_blank" rel="noopener noreferrer">' +
          (song[appsettings.mvIdCol] !== appsettings.noDataString
            ? 'ニコニコ動画'
            : 'Youtube') +
          'で見る<i class="fas fa-arrow-up-right-from-square"></i></a></div>';

        // MV公開年月日
        tag +=
          '           <div class="card-date">' + MVReleaseDateStr + '</div>';

        tag += '        </div>'; //card-item
      });
      tag += '         </div>'; //card-list
      // 敬称略 or 該当なし
      if (sortedData.length !== 0) {
        tag += '<div class="right-text">※敬称略です</div>';
      } else {
        tag += `<div class="center-text">あれ、、見つかりませんでした<br>( TДT)ｺﾞﾒﾝﾈｰ</div>`;
      }
    }

    // ページング作成
    tag += createPagingTag(display, sortedData);

    // 該当アリの場合にのみ表示
    if (sortedData.length !== 0) {
      // カラーチェンジ
      tag +=
        ' <h2 id="changeColor" class="center-text margin-top-20" style="cursor: pointer;" onclick="changeColor(1)">Color ↺</h2>';

      // サイト情報
      tag += ' <footer style="text-align: center; margin-top: 2rem;">';
      tag +=
        '   <a href="about.html" target="_blank" rel="noopener noreferrer">サイト情報</a>';
      tag += ' </footer>';
    }
    // タグ流し込み
    $('#display').append(tag);

    // 紙吹雪
    if (isMikuBirthday) {
      // 6月4日限定の紙吹雪
      $('#confetti').prepend('<canvas id="canvas"></canvas>');
      dispConfettifor0604();
    }

    // CSS適用
    changeColor(0);

    // TODO 背景画像のcss設定
    // cssRules.forEach((rule) =>
    //   styleSheet.insertRule(rule, styleSheet.cssRules.length)
    // );

    // 画像拡大設定
    addEnlargeImageEvent();
  } catch (error) {
    // エラーハンドリング
    showError('Failed to createDisplay:', error);
  }
}
