// @ts-nocheck
import DeviceDiscovery from "@SignalRGB/DeviceDiscovery";
import LCD from "@SignalRGB/lcd";
export function Name() { return "Thermalright Device"; }
export function VendorId() { return 0x87AD; }
export function ProductId() { return 0x70DB; }
export function Publisher() { return "WhirlwindFx"; }
export function Documentation(){ return "troubleshooting/thermalright"; }
export function Size() { return [1, 1]; }
export function Type() { return "rawusb"; }
export function DeviceType() { return "lcd"; }
export function SubdeviceController() { return true; }
export function ConflictingProcesses() { return ["TRCC.exe"]; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/default/misc/usb-drive-render.png"; }
export function ControllableParameters(){
	return [];
}

export function Initialize() {
	THERMALRIGHT.Initialize();
}

export function Render() {
	THERMALRIGHT.sendColors();
}

export function Shutdown(SystemSuspending) {
	
}

export class THERMALRIGHT_Device_Protocol {
	constructor() {
		this.Config = {
			DeviceModel: 0,
			DeviceName: "Thermalright Device",
			Initialized: false
		};
	}

	getDeviceProperties(id) {

		const deviceConfig = THERMALRIGHTdeviceLibrary.LEDLibrary[id];

		if(!deviceConfig) {
			console.log(`Unknown Device ID: [${id}]. Reach out to support@signalrgb.com, or visit our Discord to get it added.`);
		}

		return deviceConfig;
	};

	getDeviceModel() { return this.Config.DeviceModel; }
	setDeviceModel(deviceID) { this.Config.DeviceModel = deviceID; }

	getDeviceName() { return this.Config.DeviceName; }
	setDeviceName(deviceName) { this.Config.DeviceName = deviceName; }

	getDeviceWidth() { return this.Config.width; }
	setDeviceWidth(width) { this.Config.width = width; }

	getDeviceHeight() { return this.Config.height; }
	setDeviceHeight(height) { this.Config.height = height; }

	getDeviceEncoding() { return this.Config.encoding; }
	setDeviceEncoding(encoding) { this.Config.encoding = encoding; }

	getDeviceImage() { return this.Config.image; }
	setDeviceImage(image) { this.Config.image = image; }

	getDeviceRoundedScreen() { return this.Config.rounded; }
	setDeviceRoundedScreen(rounded) { this.Config.rounded = rounded; }

	getInitialized() { return this.Config.Initialized; }
	setInitialized(status) { this.Config.Initialized = status; }

	Initialize() {
		// Fetch model
		const modelID	=	this.fetchFirmwareData();

		const DeviceProperties = this.getDeviceProperties(modelID);

		if(DeviceProperties){
			this.setDeviceModel(modelID);
			this.setDeviceName(DeviceProperties.name);
			this.setDeviceWidth(DeviceProperties.width);
			this.setDeviceHeight(DeviceProperties.height);
			this.setDeviceEncoding(DeviceProperties.encoding);
			this.setDeviceImage(DeviceProperties.image);
			this.setDeviceRoundedScreen(DeviceProperties.rounded);
			this.setInitialized(true);

			console.log(`Device model found: ` + this.getDeviceName());
			device.setName(this.getDeviceName());
			device.setImageFromUrl(this.getDeviceImage());

			LCD.initialize({ width: this.getDeviceWidth(), height: this.getDeviceHeight(), circular: this.getDeviceRoundedScreen() });
		}else{
			device.notify("Unknown device", `Reach out to support@signalrgb.com, or visit our Discord to get it added.`, 1);
			console.log("Model not found in library!");
			console.log("Unknown model: "+ modelID.toString(16).toUpperCase());

			DeviceDiscovery.foundVirtualDevice({
				type: "lcd",
				name: modelID,
				supported: false,
				vendorId: 0x87AD
			});
		}
	}

	sendColors() {

		if(!this.getDeviceModel() || !this.getInitialized()){
			return;
		}

		const deviceWidth = this.getDeviceWidth();
		const deviceHeight = this.getDeviceHeight();

		// Frozen Warframe Pro consumes RGB565 most-significant byte first.
		// Use SignalRGB's native conversion instead of swapping every pixel in JavaScript.
		const frameFormat = this.getDeviceModel() === 0x20
			? "NZXT::RGB565"
			: this.getDeviceEncoding();
		const LCDData = LCD.getFrame({ format: frameFormat });

		const header = new Array(64).fill(0);
		header[0] = 0x12;
		header[1] = 0x34;
		header[2] = 0x56;
		header[3] = 0x78;
		// Command 2 = JPEG, Command 3 = RGB565 raw pixels
		header[4] = (this.getDeviceEncoding() === "RGB565") ? 0x03 : 0x02;

		header[8]  = deviceWidth  & 0xFF;
		header[9]  = (deviceWidth  >> 8) & 0xFF;
		header[12] = deviceHeight & 0xFF;
		header[13] = (deviceHeight >> 8) & 0xFF;

		header[56] = 0x02;

		const LCDDataLength = LCDData.length;
		header[60] = LCDDataLength         & 0xFF;
		header[61] = (LCDDataLength >>  8) & 0xFF;
		header[62] = (LCDDataLength >> 16) & 0xFF;
		header[63] = (LCDDataLength >> 24) & 0xFF;

		const packet = header.concat(LCDData);
		device.bulk_transfer(0x01, packet, packet.length);
	}

	fetchFirmwareData() {
		const initPacket = new Array(64).fill(0);
		initPacket[0] = 0x12;
		initPacket[1] = 0x34;
		initPacket[2] = 0x56;
		initPacket[3] = 0x78;
		// bytes 4-7: command 0 (init) -- already zero
		initPacket[56] = 0x01;

		// Pre-sized read buffer -- some rawusb implementations require a sized array rather than []
		const readBuffer = new Array(64).fill(0);

		const MAX_RETRIES = 10;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			device.bulk_transfer(0x01, initPacket, 64);

			// Read 64-byte response from bulk IN endpoint.
			// Captures confirm response arrives on EP 0x81 within ~1ms of the write.
			// API returns either a plain number[] or an object {data: number[], length: number}.
			const raw = device.bulk_transfer(0x81, readBuffer, 64);

			// Normalise: handle both plain array and {data, length} object formats
			const resp = (raw && raw.data !== undefined) ? raw.data : raw;
			const respLen = (raw && raw.length !== undefined) ? raw.length : (resp ? resp.length : -1);

			// Debug log
			//console.log(`raw=${JSON.stringify(raw)} len=${respLen}`);

			if (!resp || respLen < 29) {
				console.log(`Init attempt ${attempt + 1}/${MAX_RETRIES}: no response`);
				device.pause(1000);
				continue;
			}

			// Boot-in-progress indicator: resp[4-7] == A1 A2 A3 A4
			if (resp[4] === 0xA1 && resp[5] === 0xA2 && resp[6] === 0xA3 && resp[7] === 0xA4) {
				console.log(`Init attempt ${attempt + 1}/${MAX_RETRIES}: device booting, waiting 3s...`);
				device.pause(3000);
				continue;
			}

			// Verify protocol magic
			if (resp[0] !== 0x12 || resp[1] !== 0x34 || resp[2] !== 0x56 || resp[3] !== 0x78) {
				console.log(`Init attempt ${attempt + 1}/${MAX_RETRIES}: unexpected magic bytes`);
				device.pause(1000);
				continue;
			}

			const sscrm = String.fromCharCode(resp[4], resp[5], resp[6], resp[7], resp[8], resp[9], resp[10], resp[11]);
			const pm    = resp[24]; // Primary model identifier
			const sub   = resp[28]; // Secondary/sub-model byte

			console.log(`Protocol: ${sscrm}`);
			console.log(`Model ID=0x${pm.toString(16).toUpperCase()}`);
			console.log(`Secondary Model ID=0x${sub.toString(16).toUpperCase()}`);
			return pm;
		}

		// No response after all retries -- Frozen Warframe Pro is the only known model
		// on this VID/PID that skips the init handshake and accepts raw RGB565 data directly.
		console.log("No init response -- assuming Frozen Warframe Pro (RGB565, no-init device)");
		return 0x20;
	}
}

export class deviceLibrary {
	constructor(){
		this.LEDLibrary	=	{

			0x01: {
				name: "Grand Vision",
				width: 480,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/grand-vision.png",
				rounded: false
			},
			0x41: {
				name: "TL-M10 Vision",
				width: 1920,
				height: 462,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/cases/tl-m10-vision.png",
				rounded: false
			},
			0x42: { // LD7 -- same resolution family as TL-M10
				name: "TL-M10 Vision",
				width: 1920,
				height: 462,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/cases/tl-m10-vision.png",
				rounded: false
			},
			0x40: {
				// Native panel is 2400x1080 but firmware upscales -- JPEG frames must be sent at 1600x720.
				name: "Wonder Vision",
				width: 1600,
				height: 720,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/wonder-vision.png",
				rounded: false
			},
			0x03: {
				name: "Core Vision",
				width: 480,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/core-vision.png",
				rounded: false
			},
			0x04: { // Hyper Vision and variants (sub byte selects exact model, all 480x480)
				name: "Hyper Vision",
				width: 480,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/hyper-vision.png",
				rounded: false
			},
			0x05: {
				name: "Mjolnir Vision",
				width: 640,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/mjolnir-vision.png",
				rounded: false
			},
			0x06: { // Frozen Vision V2 / Frozen Warframe Ultra (sub byte selects exact model, all 640x480)
				name: "Frozen Vision",
				width: 640,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/frozen-vision.png",
				rounded: false
			},
			0x07: { // Stream Vision (sub=1) / Mjolnir Vision Pro (sub!=1) -- same resolution
				name: "Stream Vision",
				width: 640,
				height: 480,
				encoding: "JPEG",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/stream-vision.png",
				rounded: false
			},
			0x20: {
				name: "Frozen Warframe Pro",
				width: 320,
				height: 320,
				encoding: "RGB565",
				image: "https://assets.signalrgb.com/devices/brands/thermalright/aio/frozen-warframe-pro.png",
				rounded: false
			},
		};
	}
}

const THERMALRIGHTdeviceLibrary = new deviceLibrary();
const THERMALRIGHT = new THERMALRIGHT_Device_Protocol();
