# Map Viewer
Minimalist tool to render octomaps from binary octree files (`.ot` or `.bt`).


## Running the server
To run the Python server to serve the static HTML viewport and run the file conversion service, launch the FastAPI app. From the project root, run:

```bash
source .venv/bin/activate
python3 -m server
```


## Compiling the file converter binary (octomap to JSON)

### Version 1
This script does not handle the special case of rendering pruned nodes. Pruned nodes are groups of 8 children represented solely as their bigger parent for optimization purposes.
```cpp
#include <octomap/ColorOcTree.h>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main(int argc, char** argv) {
    if (argc < 2) return 1;
    std::string filename = argv[1];

    octomap::AbstractOcTree* tree = octomap::AbstractOcTree::read(filename);
    auto* color_tree = dynamic_cast<octomap::ColorOcTree*>(tree);

    json j;
    j["resolution"] = color_tree->getResolution();
    j["voxels"] = json::array();

    for (auto it = color_tree->begin_leafs(), end = color_tree->end_leafs(); it != end; ++it) {
        if (color_tree->isNodeOccupied(*it)) {
            auto color = it->getColor();
            j["voxels"].push_back({
                {"x", it.getX()},
                {"y", it.getY()},
                {"z", it.getZ()},
                {"color", {color.r, color.g, color.b}}
            });
        }
    }

    std::cout << j.dump(2) << std::endl;
    return 0;
} // g++ -std=c++17 -static -I/path/include octomap2json.cpp -L/path/lib -loctomap -loctomath -o octomap2json
```

### Version 2
By associating the size of the respective node in the octree to each voxel, pruned nodes may be rendered as a bigger voxel. This encompasses all its children in a single cube on the renderer's viewport.
```cpp
#include <octomap/ColorOcTree.h>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main(int argc, char** argv) {
    if (argc < 2) return 1;
    std::string filename = argv[1];

    octomap::AbstractOcTree* tree = octomap::AbstractOcTree::read(filename);
    auto* color_tree = dynamic_cast<octomap::ColorOcTree*>(tree);

    if (!color_tree) {
        std::cerr << "File does not contain a ColorOcTree!\n";
        return 1;
    }

    json j;
    j["resolution"] = color_tree->getResolution();
    j["voxels"] = json::array();

    for (auto it = color_tree->begin_leafs(), end = color_tree->end_leafs(); it != end; ++it) {
        if (color_tree->isNodeOccupied(*it)) {
            auto color = it->getColor();
            double size = color_tree->getNodeSize(it.getDepth());
            j["voxels"].push_back({
                {"x", it.getX()},
                {"y", it.getY()},
                {"z", it.getZ()},
                {"color", {color.r, color.g, color.b}},
                {"size", size}
            });
        }
    }

    std::cout << j.dump(2) << std::endl;
    return 0;
} // g++ -std=c++17 -static -I/path/include octomap2json.cpp -L/path/lib -loctomap -loctomath -o octomap2json
```
