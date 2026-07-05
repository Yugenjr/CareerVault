import os
import shutil

ROOT_DIR = r"c:\Users\Yugendra\Downloads\CareerVault-CareerVault"

IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', '.pytest_cache', '.venv', 'venv', 'build', 'dist', '.gemini'}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return # Skip binary files

    new_content = content.replace("CareerVault", "CareerVault")
    new_content = new_content.replace("careervault", "careervault")
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated content in {filepath}")

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        # Modify dirs in place to ignore certain directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            filepath = os.path.join(root, file)
            replace_in_file(filepath)

# 1. First replace contents in all files
print("Replacing text in files...")
process_directory(ROOT_DIR)

# 2. Rename directories/files if they contain 'careervault'
print("Renaming directories and files...")
def rename_paths(directory):
    for root, dirs, files in os.walk(directory, topdown=False):
        for name in files + dirs:
            if name in IGNORE_DIRS: continue
            
            if "careervault" in name.lower():
                old_path = os.path.join(root, name)
                
                # Maintain case if possible (though we just use careervault or CareerVault based on original)
                if "CareerVault" in name:
                    new_name = name.replace("CareerVault", "CareerVault")
                elif "careervault" in name:
                    new_name = name.replace("careervault", "careervault")
                else:
                    new_name = name.replace("careervault", "careervault")
                
                new_path = os.path.join(root, new_name)
                
                try:
                    os.rename(old_path, new_path)
                    print(f"Renamed {old_path} to {new_path}")
                except Exception as e:
                    print(f"Failed to rename {old_path}: {e}")

rename_paths(ROOT_DIR)
print("Done.")
