// 打包入口：将 Three.js r170 + 后处理模块合并为单个 UMD 文件
import * as _THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// 创建可变的 THREE 副本并挂载后处理模块
const THREE = Object.assign({}, _THREE);
THREE.EffectComposer = EffectComposer;
THREE.RenderPass = RenderPass;
THREE.UnrealBloomPass = UnrealBloomPass;
THREE.ShaderPass = ShaderPass;

// 导出为全局变量
window.THREE = THREE;
