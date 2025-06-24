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
