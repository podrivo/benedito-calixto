import Foundation
import Vision
import AppKit

// usage: ocr <image> [<image> ...]  -> prints text per image
for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = ["pt-BR"]
    req.usesLanguageCorrection = true
    try? VNImageRequestHandler(cgImage: cg).perform([req])
    print("##### \(path)")
    for obs in req.results ?? [] {
        if let c = obs.topCandidates(1).first { print(c.string) }
    }
}
