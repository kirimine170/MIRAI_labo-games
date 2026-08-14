# Scratch Validation Harness

この検証環境は，goboscriptから生成したScratch 3プロジェクトを4段階で検査する．自動検証は公式Scratch editorでの最終確認を置き換えない．

## 検証アーキテクチャ

| Layer | 目的 | 実装 |
| --- | --- | --- |
| 0 | 既存の構造とビルドを維持する | `scripts/check-repository.sh`，`scripts/build-projects.sh` |
| 1 | 全8 projectの`.sb3`を静的検証する | `scripts/validate-sb3.sh` |
| 2 | P0／P1の操作と状態遷移をheadless実行する | `scripts/test-scratch-projects.sh`，`tools/scratch-validation/src/runner.js` |
| 3 | TurboWarpで対話プレビューする | `scripts/preview-project.sh` |
| 4 | 公式Scratchとの互換性を人が確認する | `docs/testing/scratch-official-smoke.md` |

Layer 1はZIPを展開せずに読み取り，絶対パス，`..`，symlink，重複entry，過大entry，不自然な圧縮率を拒否する．続いて`project.json`のJSON，Stage，target，variable，block，costume，soundの基本構造を検査する．各assetについて`assetId`，`dataFormat`，`md5ext`，ZIP内の実体，MD5を相互照合する．`extensions`は空でなければならず，Scratch標準category以外のopcodeを拒否する．結果はJSONとJUnit XMLへ出力する．

Layer 2は公式Scratch VMに近い意味での実行状態を観測するため，`@scratch/scratch-vm`を直接使う．Whiskerの調査時点のmasterは，clean installで認証情報を含む外部GitLab依存を要求したため採用しなかった．TurboWarpは高速実行系をCIの合否判定へ使わず，対話プレビューに限定する．

## 固定した実行環境とライセンス

| 対象 | 固定値 | 取得元 | ライセンス |
| --- | --- | --- | --- |
| Node.js | `24.6.0` | [nodejs.org](https://nodejs.org/) | Node.jsの配布条件に従う |
| `@scratch/scratch-vm` | `15.0.1` | [npm](https://www.npmjs.com/package/@scratch/scratch-vm)，[scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor) | `AGPL-3.0-only` |
| `@scratch/scratch-storage` | `15.0.1` | [npm](https://www.npmjs.com/package/@scratch/scratch-storage)，[scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor) | `AGPL-3.0-only` |
| goboscript | `0c5270be8aaa4c21fa61f8c06f11ea40356c1074` | [aspizu/goboscript](https://github.com/aspizu/goboscript) | upstreamの配布条件に従う |
| Rust | `nightly-2026-08-12` | rustup | Rust toolchainの配布条件に従う |

Nodeの依存解決結果は`tools/scratch-validation/package-lock.json`で固定する．clean checkoutでは次を実行する．

直接依存と再配布上の注意は`tools/scratch-validation/THIRD_PARTY_NOTICES.md`にも記録する．2026年8月14日時点の`npm audit --omit=dev`は，Scratch VM 15.0.1のtransitive依存に`hull.js`，Immutable.js，`uuid`の既知advisoryを報告する．headless harnessはScratch Renderをattachせず，VM実行前にSB3を静的検証するが，これはadvisoryの解消ではない．固定versionへ未検証のoverrideを加えず，Scratch VM更新時にauditとadapterを再評価する．

```bash
./scripts/bootstrap-goboscript.sh
npm ci --prefix tools/scratch-validation --ignore-scripts
./scripts/test-scratch-projects.sh
```

`test-scratch-projects.sh`は依存が未導入なら同じ`npm ci`を実行する．引数なしでは全8 projectを1回だけ必ずビルドし，全静的検証，P0欠陥版の一時ビルド，headless機能テストを順番に実行する．既にCIで完成版をビルド済みの場合は，出力先を明示して渡すことで，8 artifactが揃っているときだけ再ビルドしない．

```bash
SCRATCH_VALIDATION_REPORT_DIR=/tmp/mirai-reports \
  ./scripts/test-scratch-projects.sh /tmp/mirai-sb3
```

## Headless入力adapterの境界

Scratch VM 15.0.1には，rendererなしでsprite clickを送る公開高水準APIがない．また，15.0.1のnpm版Node bundleは，packageに含まれないCSSを参照する．このため，次の2つの内部依存を`tools/scratch-validation/src/scratch-vm-adapter.js`だけへ隔離した．

1. 固定package内の`src/virtual-machine.js`を読み込む．
2. `runtime.startHats('event_whenthisspriteclicked', null, target)`でclick hatを起動する．

adapterは実行前にpackage versionが厳密に`15.0.1`であることを検査する．upgrade時はこのadapterと全negative controlを再検証する．画面座標，ブラウザ自動操作，ScratchのCookie，アカウント，外部Webサービスは使わない．costumeの名前とindexはScratch VMのtarget状態から観測するが，renderer画像のpixel比較は行わない．

Sports完成シナリオでは，rendererなしのNode実行が実時間より遅くなり20秒のround timerが入力検証より先に切れるため，runner設定からStageの`time_left`だけを120へ設定する．これは完成版sourceや生成`.sb3`を変更しないfake-clock相当の安定化であり，dash回数，位置，costume，clear判定は実際の入力で検証する．本来の20秒timerとgame overは公式Scratch手動smokeで確認する．

## P0シナリオ

### sword-clicker

- 緑の旗の直後に`intro`，`current_hp=0`，`defeated_count=0`となる．
- intro中に隠れたslimeへ入力しても状態が変わらない．
- 約4秒後に`playing`，1体目のHPが5となる．
- 4回click後はHP1で討伐0，5回目で討伐1となり，HP6の2体目へ進む．
- 合計18回のclickで`clear`，討伐3となる．
- 再度緑の旗を押すとintroの初期状態へ戻る．
- 欠陥版は5回目でHP0，討伐0のまま停止する．完成版期待値を当てるnegative controlは`current_hp`の最初の不一致を検出する．

### robot-repair-clicker

- 緑の旗の直後に`intro`，修理0/30，0%，残り60秒となる．
- intro中に隠れたrobotへ入力しても状態が変わらない．
- 約4秒後に`playing`，`robot_0`となる．
- 7回click後は23%と`robot_0`，8回目は26%と`robot_25`となる．
- 30回click後は100%，`robot_100`，`clear`となる．
- 再度緑の旗を押すとintroの初期状態へ戻る．
- 欠陥版は8回目でも`robot_0`のままになる．完成版期待値を当てるnegative controlは`costume`の最初の不一致を検出する．
- 欠陥版でも30回目のclearと`robot_100`は壊れていないことを回帰確認する．

### 00_06_click_nature

- intro中の無効入力と，約3秒後の`playing`，`fish_far`を確認する．
- 7回目は`fish_far`，8回目は`fish_quarter`と座標`(102,-28)`になる．
- 30回目に`clear`，`fish_caught`，座標`(-82,42)`になる．
- 欠陥版では8回目も`fish_far`と座標`(158,-48)`のままで，negative controlがcostumeの不一致を検出する．
- 欠陥版でも30回目のclearは壊れていないことを回帰確認する．

### 00_07_click_sports

- intro中のdashは無効で，message panelのclick後に`playing`，`runner_step_1`，x座標-185となる．
- 5回dash後，Stageの`runner_x`とspriteのx座標が約-125.83，costumeが`runner_step_2`となる．
- 30回目に`clear`，x座標170，`runner_goal`となり，clear panelからretryできる．
- 欠陥版ではStageの`runner_x`だけが進み，spriteはx座標-185と`runner_step_1`のままで，negative controlがcostumeの不一致を検出する．
- 欠陥版でも30回目のclearは壊れていないことを回帰確認する．

`00_05_click_cooking`と`00_09_click_music`は，実PoCなしにcatalogの`automatable`を変更しない．

## 診断とreport

失敗時は，少なくとも`game`，`variant`，`scenario`，`action`，`expected`，`actual`，`first_divergence`を標準エラーへ表示する．reportは次へ出力される．

```text
reports/sb3-static.json
reports/sb3-static.junit.xml
reports/scratch-headless.json
reports/scratch-headless.junit.xml
```

欠陥版へ完成版の期待値を当てた結果は`XFAIL`として表示する．これは検査を省略した状態ではなく，意図した不一致が実際に生じたことを表す．期待どおり不一致にならなければrunner自体が失敗する．

## TurboWarp preview

```bash
./scripts/preview-project.sh games/sword-clicker
```

コマンドは固定goboscriptで`.sb3`を生成し，TurboWarpへ手動読込みする場所を表示する．未確認のTurboWarp CLI optionや自動起動は使わない．確認時は480×360，30 FPS，Scratch標準のclone制限，専用block／extensionなしを維持する．compiler無効化は補助比較に使えるが，その成功を公式Scratch互換の合格とは扱わない．

## 教師用欠陥と生徒用配布の分離

P0のpatch，manifest，原因，修正点は教師用情報である．`scripts/build-student-defect.sh`は一時copyへpatchを適用し，`defects/`を除去してから`.sb3`を生成する．生徒へ配布してよいのは生成した`.sb3`と生徒用worksheetだけであり，repository，patch，`catalog/defects/`，teacher guideを混ぜない．

## 自動化で保証しないこと

- 公式Scratch editorで実際に読込み，描画，音声，操作が成立すること．
- costume画像のpixel単位の見た目，音量，演出の教材品質．
- 学習者の観察，仮説，修正理由，説明の質．
- TurboWarpと公式Scratchの完全な意味的一致．
- 長時間実行時のtimer精度や全ブラウザでの性能．

これらは公式Scratch smoke testと授業rubricで評価する．
