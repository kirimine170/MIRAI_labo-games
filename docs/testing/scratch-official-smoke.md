# 公式Scratch手動スモークテスト

このチェックは，release候補の各`.sb3`について，[公式Scratch editor](https://scratch.mit.edu/projects/editor/)で人が実施する．自動化のためにScratchへログインせず，Cookie，認証情報，個人情報を保存しない．作品の公開，共有，remixは完了条件に含めない．

## 記録欄

```text
game：
complete version：
commit SHA：
.sb3 SHA-256：
browser／OS：
確認者：
確認日時：
結果：pass／fail
issueまたは観察メモ：
```

## 全project共通

- [ ] `.sb3`を公式Scratch editorへ読み込める．
- [ ] 読込み完了時にasset欠落や破損の警告がない．
- [ ] 緑の旗で開始できる．
- [ ] 主要なclick／key入力が機能する．
- [ ] 通常の成功条件に到達できる．
- [ ] 時間切れなどの失敗条件に到達できる．
- [ ] 成功後と失敗後に緑の旗を押し，再試行できる．
- [ ] retry時に進捗，timer，costume，messageが初期状態へ戻る．
- [ ] costume，背景，数字UIが欠けず，意図した順で変わる．
- [ ] 音声があるprojectは，再生，停止，音量を確認できる．音声がないprojectは「該当なし」と記録する．
- [ ] TurboWarp専用block，custom extension，専用設定を要求しない．
- [ ] ブラウザconsoleに実行継続を妨げる致命的errorがない．
- [ ] 480×360のScratch標準stage内で主要UIと操作対象が見える．
- [ ] Scratch標準のclone制限を変更せずに動作する．

## sword-clicker

- [ ] intro中のclickで進捗が増えない．
- [ ] 約4秒後に1体目がHP5で始まる．
- [ ] 4回click後にHP1，討伐0である．
- [ ] 5回目で討伐1となり，HP6の2体目が出る．
- [ ] 3体を倒すとclearになる．
- [ ] いずれかのslimeを倒さずにtimerを0まで待つとgame overになる．
- [ ] 成功後と失敗後のretryでHP，討伐数，timerが戻る．

## robot-repair-clicker

- [ ] intro中のclickで修理回数が増えない．
- [ ] 約4秒後に修理0/30，0%，残り60秒，`robot_0`で始まる．
- [ ] 7回click後に23%，`robot_0`である．
- [ ] 8回目に26%，`robot_25`へ変わる．
- [ ] 30回目に100%，`robot_100`，clearとなる．
- [ ] 修理を完了せずにtimerを0まで待つとgame overになる．
- [ ] 成功後と失敗後のretryで修理回数，割合，timer，costumeが戻る．

## 00_06_click_nature

- [ ] intro後に`fish_far`で始まり，7回目までは遠い位置を保つ．
- [ ] 8回目に`fish_quarter`へ変わり，画面上で左上へ近づく．
- [ ] 30回目に`fish_caught`とclearになる．
- [ ] 22秒以内に釣り上げなければgame overになる．
- [ ] 成功後と失敗後の緑の旗で回数，timer，魚の位置とcostumeが戻る．

## 00_07_click_sports

- [ ] intro panelをclickすると`playing`になり，選手がx座標-185から始まる．
- [ ] dash buttonとspace keyの両方が入力として機能する．
- [ ] dashごとに回数，選手の位置，走るcostumeが同期して変わる．
- [ ] 20秒以内の30回目で選手がx座標170のgoal姿勢となり，clearになる．
- [ ] 30回未満のまま20秒経過するとgame overになる．
- [ ] clear／game over panelのclickで回数，timer，位置，costumeが戻る．

## 欠陥教材の授業前確認

- [ ] 欠陥版は`scripts/build-student-defect.sh`で生成した一時`.sb3`である．
- [ ] 欠陥版の症状がmanifestの再現手順どおり発現する．
- [ ] 完成版では同じ操作で症状が発現しない．
- [ ] 生徒用の配布物にpatch，root cause，minimal fix，教師用解答が含まれない．
- [ ] 修正後に正常系，境界値，retryを再確認する．

自動検証，TurboWarp preview，本チェックが全て通った後でも，学習目標の達成や授業進行の品質は別途rubricとpilot観察で評価する．
