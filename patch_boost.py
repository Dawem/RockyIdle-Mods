import os
import shutil
import glob

def patch_file(file_path):
    print(f"Processing file: {file_path}")
    
    backup_path = file_path + ".bak"
    # If the backup already exists, restore from it to ensure we start from a clean state
    if os.path.exists(backup_path):
        print(f"Restoring clean state from backup: {backup_path}")
        shutil.copyfile(backup_path, file_path)
    else:
        print(f"Creating backup: {backup_path}")
        shutil.copyfile(file_path, backup_path)

    # Read clean content
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    js_code = """
;(function() {
  if (typeof window === 'undefined' || window.autoBoostInterval) return;
  
  window.autoBoostInterval = setInterval(() => {
    try {
      const images = document.querySelectorAll('img[alt$=" boost"]');
      images.forEach(img => {
        const iconContainer = img.parentElement;
        if (!iconContainer) return;
        
        // Ensure parent container is relative for absolute positioning of checkbox
        if (iconContainer.style.position !== 'relative' && !iconContainer.classList.contains('relative')) {
          iconContainer.classList.add('relative');
        }
        
        let checkbox = iconContainer.querySelector('.auto-boost-checkbox');
        const boostType = img.alt.replace(' boost', '').trim();
        
        if (!checkbox) {
          checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'auto-boost-checkbox';
          checkbox.checked = localStorage.getItem('auto_boost_' + boostType) === 'true';
          
          checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          
          checkbox.addEventListener('change', (e) => {
            localStorage.setItem('auto_boost_' + boostType, e.target.checked ? 'true' : 'false');
          });
          
          checkbox.style.position = 'absolute';
          checkbox.style.top = '0px';
          checkbox.style.right = '0px';
          checkbox.style.transform = 'translate(30%, -30%)';
          checkbox.style.zIndex = '99';
          checkbox.style.cursor = 'pointer';
          checkbox.style.width = '12px';
          checkbox.style.height = '12px';
          checkbox.style.accentColor = '#22c55e';
          
          iconContainer.appendChild(checkbox);
        }
        
        if (checkbox.checked && (iconContainer.classList.contains('pressable') || iconContainer.classList.contains('red-redirect-small'))) {
          iconContainer.click();
        }
      });
    } catch (e) {
      console.error('Error in auto boost check:', e);
    }
  }, 500);
})();
"""

    # Insert code before sourceMappingURL if found, otherwise at the end
    source_map_comment = "//# sourceMappingURL="
    idx = content.find(source_map_comment)
    if idx != -1:
        new_content = content[:idx] + js_code + "\n" + content[idx:]
    else:
        new_content = content + "\n" + js_code

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Successfully patched: {file_path}")
    return True

def main():
    assets_dir = os.path.join("resources", "app", "dist", "assets")
    if not os.path.exists(assets_dir):
        print(f"Error: Could not find assets folder at {assets_dir}")
        print("Please run this script from the game root directory.")
        return

    pattern = os.path.join(assets_dir, "ProgressBarSmallJs-*.js")
    files = glob.glob(pattern)
    files = [f for f in files if f.endswith(".js")]
    
    if not files:
        print(f"Error: No files matching ProgressBarSmallJs-*.js found in {assets_dir}")
        return

    success = True
    for file_path in files:
        if not patch_file(file_path):
            success = False
            break

    if success:
        print("All matching files patched successfully!")
    else:
        print("Failed to patch one or more files.")

if __name__ == "__main__":
    main()
