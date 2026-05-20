import os
import re
import json

def extract_class_info(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 正規表現パターン:
    # 1. /* ... */ のJavadocブロックを取得
    # 2. クラス直前の各種アノテーション（@Getter, @AllArgsConstructor等）をスキップ
    # 3. class / enum / interface の名前を取得
    pattern = re.compile(
        r'/\*\*(.*?)\*/\s*(?:@[\w\(\s\"\'=,\.\{\\}]*\s*)*(?:public\s+|protected\s+|private\s+)?(?:class|enum|interface)\s+(\w+)',
        re.DOTALL
    )

    results = {}
    for javadoc, class_name in pattern.findall(content):
        lines = javadoc.split('\n')
        jp_name = None
        
        for line in lines:
            # 行頭の空白や「*」を除去
            line = line.strip().lstrip('*').strip()
            if not line:
                continue
            
            # 不要なメタデータ行をスキップ
            if line.startswith('@author') or line.startswith('@Getter') or line.startswith('@'):
                continue
            if 'UKDesign.' in line:
                continue
            
            # <<DomainService>>, «DomainService», <<ValueObject>> などの記号マーカーを除去
            cleaned = re.sub(r'(?:<<|«|<<|<|<<)\s*\w+\s*(?:>>|»|>>|>|>>)', '', line)
            cleaned = cleaned.strip()
            
            if cleaned:
                # 最初に条件を満たした有効な行を「日本語名」として採用
                jp_name = cleaned
                break
        
        if jp_name and class_name:
            results[jp_name] = {
                "name": jp_name,
                "alias": class_name
            }
            
    return results

def scan_directory(base_path):
    dictionary = {}
    # 指定されたディレクトリ配下のすべてのフォルダ・ファイルを再帰的に探索
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('.java'):
                file_path = os.path.join(root, file)
                try:
                    file_info = extract_class_info(file_path)
                    dictionary.update(file_info)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    return dictionary

if __name__ == "__main__":
    # 🔍 【設定】ここに対象のJavaソースコードがあるフォルダの絶対パスまたは相対パスを入力してください
    DIRECTORY_PATH = r"C:\UK\Code\UniversalK\nts.uk\hr\nts.uk.sub\uk.hr\hr.ctx\hr.evaluation\nts.uk.ctx.hr.evaluation.dom" 
    
    # 出力するJSONファイル名
    OUTPUT_FILE = r".\dom_class_dictionary.json"

    print(f"Scanning Java files in: {DIRECTORY_PATH}")
    result_dict = scan_directory(DIRECTORY_PATH)
    
    # JSONとして保存 (インデント付き、日本語文字化け防止のために ensure_ascii=False)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as json_file:
        json.dump(result_dict, json_file, ensure_ascii=False, indent=4)
        
    print(f"Successfully exported to: {OUTPUT_FILE}")