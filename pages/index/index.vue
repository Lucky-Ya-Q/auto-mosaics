<template>
	<view class="page">
		<view class="header">
			<text class="title">分享接收</text>
			<text class="hint">从相册分享到此应用，或点击下方按钮手动选择</text>
			<view class="header-actions">
				<view class="action-btn action-btn--primary" @click="chooseImages">选择图片</view>
				<view
					v-if="images.length > 0"
					class="action-btn action-btn--outline"
					@click="clearAll"
				>
					清空
				</view>
			</view>
		</view>

		<view class="main" :class="{ 'main--with-footer': images.length > 0 }">
			<view v-if="images.length === 0" class="empty">
				<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
				<text class="empty-text">暂无图片，请从相册分享或手动选择</text>
			</view>

			<scroll-view v-else scroll-y class="list">
				<view class="grid">
					<view
						v-for="(src, index) in images"
						:key="index"
						class="thumb-wrap"
					>
						<image class="thumb" :src="src" mode="widthFix" @click="preview(index)" />
						<view class="remove-btn" @click.stop="removeImage(index)">×</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<view v-if="images.length > 0" class="footer">
			<button
				class="save-btn"
				type="primary"
				:loading="processing"
				:disabled="processing"
				@click="handleProcessAndSave"
			>
				处理并保存
			</button>
		</view>

		<view v-if="showClearConfirm" class="dialog-mask" @click="cancelClear">
			<view class="dialog-box" @click.stop>
				<text class="dialog-title">确认清空</text>
				<text class="dialog-content">确定清空所有图片吗？此操作不可恢复。</text>
				<view class="dialog-actions">
					<view class="dialog-btn dialog-btn--cancel" @click="cancelClear">取消</view>
					<view class="dialog-btn dialog-btn--confirm" @click="confirmClear">清空</view>
				</view>
			</view>
		</view>

		<view v-if="processing" class="progress-mask">
			<view class="progress-box">
				<text class="progress-title">正在处理图片</text>
				<text class="progress-text">{{ progressText }}</text>
				<progress
					class="progress-bar"
					:percent="progress"
					stroke-width="8"
					activeColor="#007aff"
					backgroundColor="#e5e5e5"
				/>
				<text class="progress-percent">{{ progress }}%</text>
			</view>
		</view>
	</view>
</template>

<script>
import { fetchSharedImages } from '@/utils/shareReceive.js'
import {
	processImageWhiteBand,
	saveImageToAlbum,
	saveCutOffDividerToAlbum,
	requestSavePermission
} from '@/utils/imageProcess.js'

export default {
	data() {
		return {
			images: [],
			consumedShareKey: '',
			dismissedShareKey: '',
			showClearConfirm: false,
			processing: false,
			progress: 0,
			progressText: ''
		}
	},
	onLoad() {
		this.loadSharedImages()
		uni.$on('shared-images', this.onSharedImages)
	},
	onShow() {
		this.loadSharedImages()
	},
	onUnload() {
		uni.$off('shared-images', this.onSharedImages)
	},
	methods: {
		onSharedImages(result) {
			this.applyResult(result, true)
		},
		loadSharedImages() {
			this.applyResult(fetchSharedImages(), false)
		},
		getShareKey(paths) {
			return [...paths].sort().join('|')
		},
		applyResult(result, forceReplace) {
			if (!result || !result.paths || result.paths.length === 0) {
				return
			}
			const key = this.getShareKey(result.paths)
			if (key === this.dismissedShareKey) {
				return
			}
			if (forceReplace || key !== this.consumedShareKey) {
				this.images = [...result.paths]
				this.consumedShareKey = key
				this.dismissedShareKey = ''
			}
		},
		removeImage(index) {
			this.images.splice(index, 1)
			if (this.images.length === 0 && this.consumedShareKey) {
				this.dismissedShareKey = this.consumedShareKey
			}
		},
		clearAll() {
			if (this.processing || this.images.length === 0) {
				return
			}
			this.showClearConfirm = true
		},
		cancelClear() {
			this.showClearConfirm = false
		},
		confirmClear() {
			if (this.consumedShareKey) {
				this.dismissedShareKey = this.consumedShareKey
			}
			this.images = []
			this.showClearConfirm = false
		},
		chooseImages() {
			if (this.processing) {
				return
			}
			uni.chooseImage({
				count: 9,
				sizeType: ['original'],
				sourceType: ['album'],
				success: (res) => {
					const paths = res.tempFilePaths || []
					for (const path of paths) {
						if (!this.images.includes(path)) {
							this.images.push(path)
						}
					}
				}
			})
		},
		preview(index) {
			uni.previewImage({
				current: index,
				urls: this.images
			})
		},
		async handleProcessAndSave() {
			if (this.processing || this.images.length === 0) {
				return
			}

			const granted = await requestSavePermission()
			if (!granted) {
				uni.showToast({ title: '需要相册权限', icon: 'none' })
				return
			}

			this.processing = true
			this.progress = 0
			this.progressText = '准备中...'

			const total = this.images.length
			let savedCount = 0

			try {
				await saveCutOffDividerToAlbum()

				for (let i = 0; i < total; i++) {
					this.progressText = `处理第 ${i + 1} / ${total} 张`
					this.progress = Math.floor((i / total) * 100)

					const tempPath = await processImageWhiteBand(this, this.images[i])
					await saveImageToAlbum(tempPath)
					savedCount++

					this.progress = Math.floor(((i + 1) / total) * 100)
					this.progressText = `已保存 ${savedCount} / ${total} 张`
				}

				uni.showToast({
					title: `已保存${savedCount}张`,
					icon: 'success',
					duration: 2000
				})
			} catch (err) {
				console.error('process and save failed', err)
				uni.showModal({
					title: '处理失败',
					content: err && err.message ? err.message : '部分图片处理或保存失败',
					showCancel: false
				})
			} finally {
				this.processing = false
				this.progressText = ''
			}
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: #f8f8f8;
}

.header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	padding: calc(env(safe-area-inset-top) + 40rpx) 32rpx 24rpx;
	background: #f8f8f8;
}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: #333;
}

.hint {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #888;
	line-height: 1.5;
}

.header-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 20rpx;
}

.action-btn {
	flex: 1;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	border-radius: 36rpx;
	box-sizing: border-box;
}

.action-btn--primary {
	background: #007aff;
	color: #fff;
}

.action-btn--outline {
	background: #fff;
	color: #666;
	border: 1rpx solid #ddd;
}

.main {
	position: fixed;
	top: calc(env(safe-area-inset-top) + 240rpx);
	left: 0;
	right: 0;
	bottom: 0;
}

.main--with-footer {
	bottom: calc(env(safe-area-inset-bottom) + 136rpx);
}

.empty {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	opacity: 0.6;
}

.empty-text {
	margin-top: 32rpx;
	font-size: 28rpx;
	color: #999;
}

.list {
	height: 100%;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	padding: 16rpx;
	gap: 16rpx;
	padding-bottom: 32rpx;
}

.thumb-wrap {
	position: relative;
	width: calc(50% - 8rpx);
	height: 320rpx;
	overflow: hidden;
	border-radius: 12rpx;
	background: #eee;
}

.remove-btn {
	position: absolute;
	top: 8rpx;
	right: 8rpx;
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	line-height: 1;
	z-index: 2;
}

.thumb {
	width: 100%;
	height: auto;
	display: block;
	vertical-align: top;
}

.footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 100;
	padding: 24rpx 32rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-top: 1rpx solid #eee;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.save-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 32rpx;
	border-radius: 44rpx;
}

.progress-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.progress-box {
	width: 560rpx;
	padding: 48rpx 40rpx;
	background: #fff;
	border-radius: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.progress-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #333;
}

.progress-text {
	margin-top: 20rpx;
	font-size: 28rpx;
	color: #666;
}

.progress-bar {
	width: 100%;
	margin-top: 32rpx;
}

.progress-percent {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #007aff;
}

.dialog-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 998;
}

.dialog-box {
	width: 560rpx;
	padding: 48rpx 40rpx 32rpx;
	background: #fff;
	border-radius: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.dialog-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #333;
}

.dialog-content {
	margin-top: 20rpx;
	font-size: 28rpx;
	color: #666;
	text-align: center;
	line-height: 1.5;
}

.dialog-actions {
	display: flex;
	gap: 24rpx;
	width: 100%;
	margin-top: 40rpx;
}

.dialog-btn {
	flex: 1;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	border-radius: 40rpx;
	box-sizing: border-box;
}

.dialog-btn--cancel {
	background: #f5f5f5;
	color: #666;
}

.dialog-btn--confirm {
	background: #ff3b30;
	color: #fff;
}

</style>
