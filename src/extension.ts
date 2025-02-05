import * as vscode from 'vscode';
import { callAPI } from './index';

// APIレスポンスの型定義
interface ApiResponse {
  [key: string]: string;
}

// サイドバーへの表示形式の成形
class ResultsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private results: vscode.TreeItem[] = [];

  refresh(selectedText: string, data: { slow: string; fast: string }[]): void {
    // 選択した文字列
    this.results = [new SelectedTextItem(selectedText)];
    if (data.length === 0) {
      this.results.push(new EmptyResultItem()); // 該当コードが存在しないとき
    } else {
      data.forEach((item, index) => {
        const parentItem = new PairGroupItem(index);
        parentItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        this.results.push(parentItem);
        
        // slowとfastをそれぞれ格納
        parentItem.children = [
          new SlowItem(item.slow),
          new FastArrowItem(item.fast)
        ];
      });
    }
    this._onDidChangeTreeData.fire();

  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element instanceof PairGroupItem) {
      return Promise.resolve(element.children);
    }
    return Promise.resolve(this.results);
  }

  clear(): void {
    this.results = [new EmptyResultItem()];
    this._onDidChangeTreeData.fire();
  }
}

// 選択した文字列の表示形式
class SelectedTextItem extends vscode.TreeItem {
  constructor(selectedText: string) {
    super(`選択したコード : ${selectedText}`, vscode.TreeItemCollapsibleState.None);
    this.tooltip = selectedText;
  }
}

// 返されたslowとfastのペアをまとめる
class PairGroupItem extends vscode.TreeItem {
  children: vscode.TreeItem[] = [];
  
  constructor(index: number) {
    super(`変換候補 ${index + 1}`, vscode.TreeItemCollapsibleState.Expanded);
  }
}

// slowコードの表示形式
class SlowItem extends vscode.TreeItem {
  constructor(public readonly slow: string) {
    super(`slow: "${slow}"`, vscode.TreeItemCollapsibleState.None);
    this.tooltip = slow;
    // クリックしてコピーできる
    this.command = {
      command: 'jsbooster.copyToClipboard',
      title: 'コピー',
      arguments: [slow]
    };
  }
}

// fastコードの表示形式
class FastArrowItem extends vscode.TreeItem {
  constructor(public readonly fast: string) {
    super(`→ fast: "${fast}"`, vscode.TreeItemCollapsibleState.None);
    this.tooltip = fast;
    // クリックしてコピーできる
    this.command = {
      command: 'jsbooster.copyToClipboard',
      title: 'コピー',
      arguments: [fast]
    };
  }
}

// 該当コードが存在しないときの表示形式
class EmptyResultItem extends vscode.TreeItem {
  constructor() {
    super("候補が見つかりませんでした", vscode.TreeItemCollapsibleState.None);
    this.tooltip = "候補が見つかりませんでした";
  }
}

// サイドバーの表示状態を確認する関数
async function isSidebarVisible(): Promise<boolean> {
  const views = await vscode.window.tabGroups.all
    .flatMap(group => group.tabs)
    .filter(tab => tab.input instanceof vscode.TabInputWebview)
    .map(tab => (tab.input as vscode.TabInputWebview).viewType);
  
  return views.includes('jsbooster-sidebar');
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "jsbooster" is now active!');

  const resultsProvider = new ResultsProvider();
  vscode.window.registerTreeDataProvider('jsboosterResults', resultsProvider);

  // 選択したコードをAPIに投げて返答を表示するコマンドの登録
  let disposable = vscode.commands.registerCommand('jsbooster.slow2fast_code', async () => {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      const document = editor.document;
      const selection = editor.selection;
      // 選択したテキストを取得
      const selectedText = document.getText(selection);

      if (selectedText) {
        try {
          // API叩き部分
          const res = await callAPI(selectedText) as ApiResponse;
          const responseMessage: { fast: string; slow: string }[] = 
            Array.isArray(res['response']) ? res['response'] : [];

          // サイドバーの表示状態を確認
          const isVisible = await isSidebarVisible();
          
          // 結果を更新
          resultsProvider.refresh(selectedText, responseMessage);

          // サイドバーが表示されていない場合のみ、表示する
          if (!isVisible) {
            await vscode.commands.executeCommand('workbench.view.extension.jsbooster-sidebar');
          }

          // フォーカスをビューに移動（サイドバーが既に開いている場合も含む）
          await vscode.commands.executeCommand('jsboosterResults.focus');

        } catch (error) {
          vscode.window.showErrorMessage('APIの呼び出しに失敗しました');
          resultsProvider.clear();
        }
      } else {
        vscode.window.showInformationMessage('何も選択されていません。');
      }
    } else {
      vscode.window.showInformationMessage('アクティブなエディタがありません。');
    }
  });

  // クリックした要素をクリップボードにコピーするコマンドの登録
  let copyDisposable = vscode.commands.registerCommand('jsbooster.copyToClipboard', (text: string) => {
    vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('コピーしました');
  });

  context.subscriptions.push(disposable, copyDisposable);

  // 拡張機能ボタンの設定
  const button = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    0
  );
  button.name = 'May Convert Fast JS';
  button.command = 'jsbooster.slow2fast_code';
  button.text = '$(rocket) May Convert Fast';
  button.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  context.subscriptions.push(button);
  button.show();
}

export function deactivate() {}