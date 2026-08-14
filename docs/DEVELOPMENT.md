# 開発フロー

## セットアップと検査

```bash
git clone https://github.com/kirimine170/MIRAI_labo-games.git
cd MIRAI_labo-games
./scripts/check-repository.sh
./scripts/bootstrap-goboscript.sh
./scripts/build-projects.sh
```

出力先を変える場合は，`./scripts/build-projects.sh /path/to/output`を使います．固定コンパイラを別の場所へ導入する場合は`GOBOSCRIPT_INSTALL_ROOT`，ビルド時にその実行ファイルを使う場合は`GOBOSCRIPT_BIN`を指定できます．

```bash
GOBOSCRIPT_INSTALL_ROOT=/tmp/mirai-goboscript ./scripts/bootstrap-goboscript.sh
GOBOSCRIPT_BIN=/tmp/mirai-goboscript/bin/goboscript ./scripts/build-projects.sh /tmp/mirai-sb3
```

## 変更の単位

1つのプルリクエストは，原則として次のいずれか1つを目的とします．

- ゲームの完成版の仕様または実装を変更する．
- 1つの学習目標に対応する欠陥，テスト，ヒント，評価基準を追加する．
- 教材原稿や教師向け手順を改善する．
- ビルド，スキーマ，検証ツールを改善する．

完成版の仕様変更と欠陥導入を1つの差分に混ぜると，意図した欠陥と偶発的な回帰を区別できなくなります．

## ゲームを追加する

1. `games/<slug>/`に`goboscript.toml`，`stage.gs`，`main.gs`，`assets/`を用意する．
2. `goboscript.toml`に`std = "2.1.0"`を設定する．
3. `tools/projects.txt`へパスを追加する．
4. `./scripts/check-repository.sh`と`./scripts/build-projects.sh`を実行する．
5. ScratchとTurboWarpで，開始，主要操作，成功，失敗，再試行を手動確認する．TurboWarp固有オプションを必須にする場合は，その理由と本家Scratchでの制約を記録する．
6. アセットごとに権利者，出典，ライセンス，改変の有無を確認する．確認できないアセットを公開物へ追加しない．

## レビューゲート

### 実装

- 意図した仕様と変更後の動作が対応している．
- ゲームの初期化と再試行で，必要な状態がすべて戻る．
- 正常系だけでなく，境界値と成功・失敗の切り替わりを確認している．
- 定数を変えた場合，プレイ時間とコード難易度の両方への影響を説明できる．

### 教材

- 学習者が期待動作，実際の動作，再現手順を分けて記録できる．
- 主原因と中心概念が1つに絞られ，意図しない別の欠陥が混入していない．
- ヒントは，観察，再現，関連変数，関連処理，修正候補の順で段階化されている．
- 修正の成否だけでなく，観察，仮説，コード特定，テスト，説明を評価できる．
- 意図した解と異なる妥当な別解の判定基準がある．
- バグがない課題を含む場合，「問題なし」と判断する根拠も評価できる．

## goboscriptを更新する

goboscriptのコマンドや対応構文を推測で変更しないでください．[公式インストール手順](https://aspiz.uk/goboscript/docs/install.html)，[公式ビルド手順](https://aspiz.uk/goboscript/docs/getting-started/index.html#compile-the-project)，[公式設定リファレンス](https://aspiz.uk/goboscript/docs/configuration.html)，対象コミットのCLI定義を一次資料とします．

1. 対象リリースまたはコミットの40桁SHAを確定する．
2. 対象コミットの作成日付に対応するnightly Rustを確定する．
3. 一時ディレクトリへ導入し，全プロジェクトのコンパイルと手動プレイテストを先に行う．
4. `tools/goboscript-version.env`のリポジトリ，SHA，Rustを同時に更新する．標準ライブラリを更新する場合は，3つの`goboscript.toml`と同時に変更する．
5. CIと手動プレイテストの結果，互換性上の変更，ロールバック先のSHAをプルリクエストに記録する．

## コミット前の最小確認

```bash
./scripts/check-repository.sh
./scripts/build-projects.sh /tmp/mirai-sb3
git diff --check
git status --short
```

ゲームロジックや教材内容を変更した場合は，これに加えて手動確認結果を記録します．
