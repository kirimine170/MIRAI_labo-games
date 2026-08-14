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

## ゲーム単位のSemantic Versioning

完成版`.sb3`のバージョンは，各`catalog/games/*.json`の`versions.complete.version`を正本とする．書式は`MAJOR.MINOR.PATCH`である．

- `MAJOR`：操作方法，状態遷移，学習目標，外部から参照する変数・メッセージなど，既存教材との互換性を壊す変更．
- `MINOR`：後方互換な機能，演出，教材上の観察点，テスト可能な振る舞いの追加．
- `PATCH`：意図した仕様を変えない不具合修正，文言・アセット修正，内部整理．

バージョン更新には手編集ではなく，次のコマンドを使う．所有ゲームの欠陥manifestに記録された完成版とbase versionも同時に更新される．

```bash
python3 tools/game_versions.py bump 00_05 patch
python3 tools/game_versions.py bump 00_09 minor
python3 tools/game_versions.py bump 00_00 major
```

CIは，完成版のコンパイルへ影響するゲームソース，設定，アセットの変更をGit差分から検出する．該当ゲームのバージョンが比較元より大きくない場合は失敗する．教師用`defects/`とアセット権利manifestだけの変更は完成版`.sb3`を変えないため，完成版のバージョン増加対象外である．どの段階を上げるかは変更の互換性を理解する変更者が決め，CIは増加の有無と書式を検査する．

## GitHub Release

`scripts/build-release.sh`は，catalogに登録された完成版を固定goboscriptでビルドし，ゲームID，slug，バージョンを含むファイル名を付ける．同時に`release-manifest.json`と`SHA256SUMS`を生成する．出力先は空のディレクトリでなければならない．

```bash
RELEASE_VERSION=1.0.0 GOBOSCRIPT_BIN=/path/to/goboscript \
  ./scripts/build-release.sh /tmp/mirai-release
```

GitHub Actionsで公開する場合は，検証済みのコミットへSemantic Versioning形式のタグを付ける．

```bash
# 手動QAとライセンス確定前の公開候補
git tag -a prerelease-v1.0.0 -m "MIRAI labo games prerelease v1.0.0"
git push origin prerelease-v1.0.0

# catalog上の全ゲームがverifiedになった後の正式版
git tag -a release-v1.0.0 -m "MIRAI labo games v1.0.0"
git push origin release-v1.0.0
```

タグpush後，`.github/workflows/release.yml`がcatalog，単体テスト，固定ツールチェーン，全`.sb3`のZIP整合を検証し，GitHub Releaseへ7ゲーム，manifest，チェックサムを添付する．`LICENSE`がない場合，または`needs_qa`を含む状態で正式タグを付けると失敗する．現状は実機QAとリポジトリのライセンス方針が未確定であるため，プレリリースを使用する．

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
