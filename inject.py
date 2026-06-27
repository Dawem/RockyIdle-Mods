import os
import sys
import shutil
import glob
import re

# 1. Determine target paths
base_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(base_dir)

possible_html_paths = [
    os.path.join(parent_dir, "resources", "app", "dist", "index.html"),
    os.path.join(parent_dir, "dist", "index.html"),
    "f:/SteamLibrary/steamapps/common/Rocky Idle/resources/app/dist/index.html",
]

html_path = None
for path in possible_html_paths:
    if os.path.exists(path):
        html_path = path
        break

if not html_path:
    print("Error: Could not find resources/app/dist/index.html automatically.")
    sys.exit(1)

dist_dir = os.path.dirname(html_path)
dist_mods_dir = os.path.join(dist_dir, "mods")

# 2. Compile all TypeScript mods in-place
tsconfig_path = os.path.join(base_dir, "tsconfig.json")
if os.path.exists(tsconfig_path):
    print("tsconfig.json found. Compiling all TypeScript mods...")
    import subprocess
    result = subprocess.run(["npx", "-p", "typescript", "tsc", "-p", "tsconfig.json"], cwd=base_dir, shell=True, capture_output=True, text=True)
    if result.stdout or result.stderr:
        print("--- TypeScript Compiler Output ---")
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print("----------------------------------")
    print("TypeScript compilation completed.")

# 3. Clear existing distribution mods folder to remove stale mods
if os.path.exists(dist_mods_dir):
    try:
        shutil.rmtree(dist_mods_dir)
        print("Cleared existing dist mods directory.")
    except Exception as e:
        print(f"Warning: Could not clear dist mods directory: {e}")
os.makedirs(dist_mods_dir, exist_ok=True)

# 4. Scan for mod folders and copy their JavaScript builds
active_mods = []  # List of tuples (mod_name, file_name, relative_url)

for item in os.listdir(base_dir):
    item_path = os.path.join(base_dir, item)
    if os.path.isdir(item_path) and item.lower() != "types" and not item.startswith("."):
        # Scan for JavaScript files inside this mod folder
        for f in os.listdir(item_path):
            if f.endswith(".js"):
                source_js = os.path.join(item_path, f)
                target_mod_dir = os.path.join(dist_mods_dir, item)
                os.makedirs(target_mod_dir, exist_ok=True)
                dest_js = os.path.join(target_mod_dir, f)
                
                try:
                    with open(source_js, "r", encoding="utf-8") as js_f:
                        js_code = js_f.read()
                    
                    # Clean up TypeScript's ES Module export boilerplate to prevent browser runtime errors
                    js_code = re.sub(r"\bexport\s*\{\s*\}\s*;?", "", js_code)

                    # Clean up ES module import statements to prevent browser syntax errors
                    js_code = re.sub(r"\bimport\s+.*?\s+from\s+['\"].*?['\"];?", "", js_code)

                    # Clean up inline export statements to make declarations global
                    js_code = re.sub(r"\bexport\s+(const|let|var|function|class)\b", r"\1", js_code)
                    js_code = re.sub(r"\bexport\s+default\s+", "", js_code)
                    
                    with open(dest_js, "w", encoding="utf-8") as js_f:
                        js_f.write(js_code)
                        
                    relative_url = f"./mods/{item}/{f}"
                    active_mods.append((item, f, relative_url))
                    print(f"Copied and cleaned mod '{item}' ({f}) to game resources.")
                except Exception as e:
                    print(f"Error processing mod '{item}' ({f}): {e}")

# 5. Expose Slayer utility functions in the compiled bundle
assets_dir = os.path.join(dist_dir, "assets")
js_files = glob.glob(os.path.join(assets_dir, "index-*.js"))
if js_files:
    js_path = js_files[0]
    print(f"Checking JS bundle for exposer hooks: {js_path}")
    with open(js_path, "r", encoding="utf-8") as f:
        js_content = f.read()

    js_modified = False
    
    # Expose getNewSlayerTask
    if "window.getNewSlayerTask" not in js_content:
        js_content = js_content.replace(
            "const getNewSlayerTask = ",
            "const getNewSlayerTask = window.getNewSlayerTask = "
        )
        js_modified = True
        print(" -> Exposed getNewSlayerTask globally.")

    # Expose getMonsterAmount
    if "window.getMonsterAmount" not in js_content:
        js_content = js_content.replace(
            "const getMonsterAmount = ",
            "const getMonsterAmount = window.getMonsterAmount = "
        )
        js_modified = True
        print(" -> Exposed getMonsterAmount globally.")

    # Expose AllSlayerMasters
    if "window.AllSlayerMasters" not in js_content:
        js_content = js_content.replace(
            "const AllSlayerMasters = ",
            "const AllSlayerMasters = window.AllSlayerMasters = "
        )
        js_modified = True
        print(" -> Exposed AllSlayerMasters globally.")

    # Expose AllMonsters
    if "window.AllMonsters" not in js_content:
        js_content = js_content.replace(
            "const AllMonsters = ",
            "const AllMonsters = window.AllMonsters = "
        )
        js_modified = True
        print(" -> Exposed AllMonsters globally.")

    # Expose getMonsterInfo
    if "window.getMonsterInfo" not in js_content:
        js_content = js_content.replace(
            "const getMonsterInfo = (",
            "const getMonsterInfo = window.getMonsterInfo = ("
        )
        js_modified = True
        print(" -> Exposed getMonsterInfo globally.")

    # Expose i18n instance
    if "window.i18n" not in js_content:
        js_content = js_content.replace(
            "instance.use(resourcesToBackend(resolveLoader))",
            "window.i18n = instance; instance.use(resourcesToBackend(resolveLoader))"
        )
        js_modified = True
        print(" -> Exposed i18n globally.")

    # Expose SlayerCategoriesIds enum
    if "window.SlayerCategoriesIds" not in js_content:
        js_content = js_content.replace(
            "})(SlayerCategoriesIds || {});",
            "})(window.SlayerCategoriesIds = SlayerCategoriesIds || {});"
        )
        js_modified = True
        print(" -> Exposed SlayerCategoriesIds globally.")

    # Expose getWeakestAttackStyleSkillId helper
    if "window.getWeakestAttackStyleSkillId" not in js_content:
        js_content = js_content.replace(
            "function getWeakestAttackStyleSkillId(stats) {",
            "window.getWeakestAttackStyleSkillId = getWeakestAttackStyleSkillId; function getWeakestAttackStyleSkillId(stats) {"
        )
        js_modified = True
        print(" -> Exposed getWeakestAttackStyleSkillId globally.")

    if js_modified:
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print("Successfully updated JS bundle with exposed slayer functions.")
else:
    print("Warning: Could not locate index-*.js bundle to expose slayer utilities.")

# 6. Read and update index.html
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Clean up existing exposer scripts
if "ZUSTAND EXPOSER" in content:
    content = re.sub(r"<!-- ZUSTAND EXPOSER START -->.*?<!-- ZUSTAND EXPOSER END -->", "", content, flags=re.DOTALL)
    print("Cleaned up existing exposer definition in index.html.")

# Clean up legacy root mod.js script tags
content = re.sub(r"\s*<script\s+src=['\"]./mod\.js['\"]\s*>\s*</script>\s*", "", content)
print("Cleaned up legacy mod.js tag references in index.html.")

# Clean up modular mods/ script tags
content = re.sub(r"\s*<script\s+src=['\"]./mods/[^'\"]+['\"]\s*>\s*</script>\s*", "", content)
print("Cleaned up existing sub-mod tag references in index.html.")

# Define the exposer script block to inject
exposer_script = """
    <!-- ZUSTAND EXPOSER START -->
    <script>
      // Global React Fiber inspector helper
      window.getFiber = function(el) {
        if (!el) return null;
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
        return key ? el[key] : null;
      };

      // Mod callback registration queue
      window.modCallbacks = window.modCallbacks || [];
      window.createMod = function(callback) {
        if (typeof callback === 'function') {
          if (window.playerStore && window.persistentStore) {
            try {
              callback({
                player: window.playerStore,
                playerStore: window.playerStore,
                persistent: window.persistentStore,
                persistentStore: window.persistentStore
              });
            } catch (e) {
              console.error("[Mod Callback Error]:", e);
            }
          } else {
            window.modCallbacks.push(callback);
          }
        }
      };

      // Centralized search loop
      (function find() {
        const docs = [document];
        try {
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            try {
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              if (doc) docs.push(doc);
            } catch (e) {}
          });
        } catch (e) {}

        const roots = [];
        docs.forEach(doc => {
          try {
            const all = doc.getElementsByTagName('*');
            for (let i = 0; i < all.length; i++) {
              const el = all[i];
              const key = Object.keys(el).find(k => k.startsWith('__react'));
              if (key) {
                let fiber = el[key];
                if (key.startsWith('__reactContainer')) {
                  roots.push(fiber.current || fiber);
                } else {
                  let curr = fiber;
                  while (curr.return) curr = curr.return;
                  roots.push(curr);
                }
                break;
              }
            }
          } catch (e) {}
        });

        if (roots.length === 0) {
          setTimeout(find, 500);
          return;
        }

        function extractStore(val) {
          if (!val || typeof val !== 'object') return null;
          if (typeof val.getState === 'function') return val;
          if (Array.isArray(val)) {
            for (const item of val) {
              const found = extractStore(item);
              if (found) return found;
            }
          }
          return null;
        }

        let playerStore = null;
        let persistentStore = null;

        function search(node) {
          if (!node) return;
          let hook = node.memoizedState;
          while (hook && typeof hook === 'object') {
            const store = extractStore(hook.memoizedState);
            if (store) {
              const state = store.getState();
              if (state?.state?.skills || state?.skills) {
                playerStore = store;
              } else if ('lootOption' in state || 'showCompleted' in state) {
                persistentStore = store;
              }
            }
            hook = hook.next;
          }
          search(node.child);
          search(node.sibling);
        }

        for (const root of roots) {
          search(root);
        }

        if (playerStore && persistentStore) {
          window.playerStore = playerStore;
          window.persistentStore = persistentStore;
          console.log("[Zustand Injector] Stores successfully exposed!");
          
          const storesObj = {
            player: playerStore,
            playerStore,
            persistent: persistentStore,
            persistentStore
          };
          // Execute all queued callbacks
          while (window.modCallbacks.length > 0) {
            const cb = window.modCallbacks.shift();
            try {
              cb(storesObj);
            } catch (e) {
              console.error("[Mod Callback Error]:", e);
            }
          }
        } else {
          // Expose partial stores as they load
          if (playerStore) window.playerStore = playerStore;
          if (persistentStore) window.persistentStore = persistentStore;
          setTimeout(find, 500);
        }
      })();
    </script>
    <!-- ZUSTAND EXPOSER END -->
"""

# Build script tags for all active mods
mod_script_tags = ""
for mod in active_mods:
    mod_script_tags += f'    <script src="{mod[2]}"></script>\n'

# Insert ZUSTAND EXPOSER first, followed by all modular scripts
combined_insertion = f"{exposer_script}\n{mod_script_tags}"
content = content.replace("</body>", f"{combined_insertion}  </body>")
print("Injected exposer and active mod script tags in index.html.")

# Write back index.html
with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("HTML script links verified and updated successfully!")
