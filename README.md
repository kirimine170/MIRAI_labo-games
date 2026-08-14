# MIRAI_labo-games

Scratchのゲームを題材に，不具合の観察，原因仮説，修正，テスト，説明を学ぶ「デバッグラーニング」教材の開発リポジトリです．ゲームは[goboscript](https://aspiz.uk/goboscript/docs/)で記述し，Scratchプロジェクトの`.sb3`へコンパイルします．

## 現在の収録プロジェクト

| パス | 位置付け |
| --- | --- |
| `games/sword-clicker` | 剣でスライムを倒す連打ゲーム |
| `games/robot-repair-clicker` | ロボットを修理する連打ゲーム |
| リポジトリ直下 | goboscriptの最小スモークテスト．教材ゲームではない |

現段階では完成版ゲームのソースが中心です．「教材として完成」の判定には，欠陥版，学習者向け資料，教師向け資料，ヒント，評価基準，テストが別途必要です．

## 開発を始める

必要なものは`git`，`rustup`，`unzip`です．リポジトリ直下で次を実行します．

```bash
./scripts/check-repository.sh
./scripts/bootstrap-goboscript.sh
./scripts/build-projects.sh
```

`bootstrap-goboscript.sh`は，`tools/goboscript-version.env`に固定したnightly Rustとgoboscriptの特定コミットを`.tools/`へ導入します．`build-projects.sh`は`tools/projects.txt`に登録された全プロジェクトをコンパイルし，`build/`へ`.sb3`を出力した後，ZIPコンテナの整合性を確認します．`.tools/`，`build/`，`.sb3`はGitの管理対象外です．

出力した`.sb3`はScratchエディタまたはTurboWarpで開き，必ず手動で開始，成功，失敗，再試行まで確認してください．CIのコンパイル成功は，ゲームプレイや教材品質の保証ではありません．

## リポジトリ構成

```text
games/                 プレイ可能なgoboscriptゲーム
scripts/               構造検査，ツール導入，一括ビルド
tools/                 固定バージョンとビルド対象一覧
docs/                  アーキテクチャと開発フロー
.github/workflows/     GitHub Actionsによる構造検査とビルド
```

設計上の境界は[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，変更手順と品質ゲートは[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)を参照してください．

## データと権利

子どもや実験参加者の氏名，音声，映像，対応表，同意書，未匿名化の操作ログをこのリポジトリへ保存しないでください．非公開研究データは，アクセス権限を制限した別の保管先で管理します．

### 未決定：ライセンス

リポジトリ所有者による方針決定がまだないため，`LICENSE`は追加していません．コード，教材文書，画像・音声アセットに同一ライセンスを適用できるとは限りません．権利者，出典，改変可否，再配布可否を確定した後，対象範囲を明記したライセンスを追加する必要があります．現状のファイルを，明示的な許諾があるものと解釈しないでください．
