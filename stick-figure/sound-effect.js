const audioUtil = {};

/*
	1. obtain an mp4 file
	2. convert it to a base64 string
	3. use this function to compress the base64 string
		audioUtil.compressFromBase64(BASE64_STRING).then(compressed => {
			console.log(compressed);
		});
	4. use the result as input for "decompressToBase64"
*/

audioUtil.compressFromBase64 = (() => {
	async function deflateArrBuff(in_arrBuff) {
		const stream1 = new Blob([in_arrBuff]).stream();
		const stream2 = stream1.pipeThrough(new CompressionStream('deflate'));
		return await new Response(stream2).arrayBuffer();
	}
	async function deflateText(in_text) {
		const originalArrBuff = new TextEncoder().encode(in_text);
		const deflatedArrBuff = await deflateArrBuff(originalArrBuff);
		return String.fromCharCode(...new Uint8Array(deflatedArrBuff));
	}
	return async (in_base64) => {
		return btoa(await deflateText(in_base64));
	}
})();

/*
	1. first, compress the data using "compressFromBase64"
	2. decompress the data using audioUtil.decompressToBase64
		audioUtil.decompressToBase64(COMPRESSED_STRING).then(decompressed => {
			const foo = new Audio('data:audio/mpeg;base64,' + decompressed);
			foo.play();
		});

*/

audioUtil.decompressToBase64 = (() => {
	async function inflateArrBuff(in_arrBuff) {
		const stream1 = new Blob([in_arrBuff]).stream();
		const stream2 = stream1.pipeThrough(new DecompressionStream('deflate'));
		return await new Response(stream2).arrayBuffer();
	}
	async function inflateBase64(in_base64) {
		const bin = atob(in_base64);
		const arr = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) {
			arr[i] = bin.charCodeAt(i);
		}
		const inflatedArrBuff = await inflateArrBuff(arr.buffer);
		return new TextDecoder().decode(inflatedArrBuff);
	}
	return async (in_base64) => {
		return await inflateBase64(in_base64);
	}
})();

export const MOVED = audioUtil.decompressToBase64('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');

export const ERROR = audioUtil.decompressToBase64('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');

export const SHUTTER = audioUtil.decompressToBase64('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');

export const RELEASE = audioUtil.decompressToBase64('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');
