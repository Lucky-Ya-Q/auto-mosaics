// #ifdef APP-PLUS
import { getSharedImagesFromNative } from '@/uni_modules/auto-share-receive'
// #endif

export function fetchSharedImages() {
	// #ifdef APP-PLUS
	try {
		return getSharedImagesFromNative()
	} catch (e) {
		return { paths: [], debug: String(e) }
	}
	// #endif
	// #ifndef APP-PLUS
	return { paths: [], debug: 'not-app' }
	// #endif
}
