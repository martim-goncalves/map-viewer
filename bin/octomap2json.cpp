#include <octomap/ColorOcTree.h>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main(int argc, char** argv) {
    if (argc < 2) return 1;
    std::string filename = argv[1];

    octomap::AbstractOcTree* tree = octomap::AbstractOcTree::read(filename);
    auto* colorTree = dynamic_cast<octomap::ColorOcTree*>(tree);

    json j;
    j["resolution"] = colorTree->getResolution();
    j["voxels"] = json::array();

    for (auto it = colorTree->begin_leafs(), end = colorTree->end_leafs(); it != end; ++it) {
        if (colorTree->isNodeOccupied(*it)) {
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
