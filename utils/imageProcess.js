/** 涂白区域：距图片顶部 485px ~ 565px */
export const MASK_Y_START = 485
export const MASK_Y_END = 565

function toLocalPath(src) {
	if (!src) {
		return ''
	}
	if (src.startsWith('file://')) {
		return src.substring(7)
	}
	return src
}

function createOutputPath() {
	const name = 'processed_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.jpg'
	return toLocalPath(plus.io.convertLocalFileSystemURL('_doc/' + name))
}

const CUT_OFF_SRC = '/static/cut-off.png'

export function saveImageToAlbum(filePath) {
	return new Promise((resolve, reject) => {
		uni.saveImageToPhotosAlbum({
			filePath,
			success: resolve,
			fail: reject
		})
	})
}

/** 将分割线图片保存到相册 */
export function saveCutOffDividerToAlbum() {
	return new Promise((resolve, reject) => {
		uni.getImageInfo({
			src: CUT_OFF_SRC,
			success: (info) => {
				const path = info.path || CUT_OFF_SRC
				saveImageToAlbum(path).then(resolve).catch(reject)
			},
			fail: (err) => reject(new Error('分割线图片加载失败'))
		})
	})
}

export function requestSavePermission() {
	return new Promise((resolve) => {
		// #ifdef APP-PLUS
		if (typeof plus === 'undefined' || plus.os.name !== 'Android') {
			resolve(true)
			return
		}
		const permissions = [
			'android.permission.WRITE_EXTERNAL_STORAGE',
			'android.permission.READ_MEDIA_IMAGES'
		]
		plus.android.requestPermissions(
			permissions,
			() => resolve(true),
			() => resolve(true)
		)
		return
		// #endif
		// #ifndef APP-PLUS
		resolve(true)
		// #endif
	})
}

export function processImageWhiteBand(_component, src) {
	return new Promise((resolve, reject) => {
		// #ifdef APP-PLUS
		try {
			if (typeof plus === 'undefined' || plus.os.name !== 'Android') {
				reject(new Error('当前仅支持 Android App'))
				return
			}

			const path = toLocalPath(src)
			if (!path) {
				reject(new Error('图片路径无效'))
				return
			}

			const BitmapFactory = plus.android.importClass('android.graphics.BitmapFactory')
			const Bitmap = plus.android.importClass('android.graphics.Bitmap')
			const Config = plus.android.importClass('android.graphics.Bitmap$Config')
			const Canvas = plus.android.importClass('android.graphics.Canvas')
			const Color = plus.android.importClass('android.graphics.Color')
			const Paint = plus.android.importClass('android.graphics.Paint')
			const CompressFormat = plus.android.importClass('android.graphics.Bitmap$CompressFormat')
			const FileOutputStream = plus.android.importClass('java.io.FileOutputStream')

			const srcBitmap = BitmapFactory.decodeFile(path)
			if (srcBitmap == null) {
				reject(new Error('无法读取图片'))
				return
			}

			const bitmap = srcBitmap.copy(Config.ARGB_8888, true)
			srcBitmap.recycle()

			if (bitmap == null) {
				reject(new Error('图片处理失败'))
				return
			}

			const width = bitmap.getWidth()
			const height = bitmap.getHeight()
			const canvas = new Canvas(bitmap)
			const paint = new Paint()
			paint.setColor(Color.WHITE)
			paint.setStyle(1)

			const yStart = Math.max(0, MASK_Y_START)
			const yEnd = Math.min(height, MASK_Y_END)
			if (yEnd > yStart) {
				canvas.drawRect(0, yStart, width, yEnd, paint)
			}

			const outPath = createOutputPath()
			const fos = new FileOutputStream(outPath)
			bitmap.compress(CompressFormat.JPEG, 100, fos)
			fos.flush()
			fos.close()
			bitmap.recycle()

			resolve(outPath)
		} catch (e) {
			const message = e && e.message ? e.message : String(e)
			reject(new Error(message))
		}
		return
		// #endif
		// #ifndef APP-PLUS
		reject(new Error('请在 App 中使用'))
		// #endif
	})
}
