import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";



// Variables
const modelName = "pixtopix32_128_20feb_shrinked_retr_unet_best_graph_model_tfjs";
let modelUrl = `assets/${modelName}/model.json`;
console.log("model", modelUrl);

let model = await tf.loadGraphModel(modelUrl);
tf.enableProdMode()

let canvas_output = document.getElementById("canvas_output")


// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([
    { client: 'Chrome' },
]);
function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}
/**
 * @fileoverview Demonstrates a minimal use case for MediaPipe face tracking.
 */
const controls = window;
const drawingUtils = window;
const mpFaceDetection = window;
// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

var old = ""
var cc = 0
async function onResults(results) {

    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    //canvasCtx.save();
    //canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.detections.length > 0) {
        drawingUtils.drawRectangle(canvasCtx, results.detections[0].boundingBox, {
            color: 'blue',
            lineWidth: 4,
            fillColor: '#00000000'
        });
        const detection = results.detections[0];
        const bbox = detection.boundingBox;
        const batched = tf.tidy(() => {
            var img = tf.browser.fromPixels(results.image)
            let y1 = bbox.yCenter - bbox.height / 2
            let x1 = bbox.xCenter - bbox.width / 2
            let y2 = bbox.yCenter + bbox.height / 2
            let x2 = bbox.xCenter + bbox.width / 2
            let boxes = [[y1, x1, y2, x2]];
            img = tf.image.cropAndResize(tf.expandDims(img), boxes, [0], [128, 128]).squeeze()

            img = img.resizeBilinear([128, 128]).div(tf.scalar(127.5)).sub(tf.scalar(1.0));
            //img.dispose()
            // Reshape to a single-element batch so we can pass it to executeAsync.
            return tf.expandDims(img);
        });
        const result = model.predict(batched)
        let res_y = Math.round(bbox.height * canvasElement.height)
        let res_x = Math.round(bbox.width * canvasElement.width)
        const pred = result.mul(tf.scalar(0.5)).add(tf.scalar(0.5)).squeeze().resizeBilinear([res_y, res_x])


        // Convert the pred tensor to a pixel array.
        // Create an ImageData object from the pixel array.
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        if ( cc % 1 === 0) {
            await tf.browser.toPixels(pred, canvas_output);
            old = canvas_output
        }
        else{
            //await tf.browser.toPixels(old, canvas_output);
        }

        cc +=1



       /* canvasCtx.drawImage(
            canvas_output,
            bbox.xCenter * canvasElement.width - canvasElement.width * bbox.width / 2,
            bbox.yCenter * canvasElement.height - canvasElement.height * bbox.height / 2,
            bbox.width * canvasElement.width,
            bbox.height * canvasElement.height
        );*/

    }
    //canvasCtx.restore();
}
const faceDetection = new mpFaceDetection.FaceDetection({ locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
    } });
faceDetection.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
new controls
    .ControlPanel(controlsElement, {
        selfieMode: true,
        model: 'short',
        minDetectionConfidence: 0.5,
    })
    .add([
        new controls.StaticText({ title: 'MediaPipe Face Detection' }),
        fpsControl,
        new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
        new controls.SourcePicker({
            onSourceChanged: () => {
                faceDetection.reset();
            },
            onFrame: async (input, size) => {
                const aspect = size.height / size.width;
                let width, height;
                if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                }
                else {
                    width = window.innerWidth;
                    height = width * aspect;
                }
                canvasElement.width = width;
                canvasElement.height = height;
                await faceDetection.send({ image: input });
            },
            examples: {
                images: [],
                videos: [],
            },
        }),
        new controls.Slider({
            title: 'Model Selection',
            field: 'model',
            discrete: { 'short': 'Short-Range', 'full': 'Full-Range' },
        }),
        new controls.Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
    ])
    .on(x => {
        const options = x;
        videoElement.classList.toggle('selfie', options.selfieMode);
        faceDetection.setOptions(options);
    });