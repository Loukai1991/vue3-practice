// 如果环境不支持WeakMap，则使用polyfill
if (typeof WeakMap === 'undefined') {
    (function () {
        // 使用普通的JavaScript对象模拟WeakMap
        function PolyfillWeakMap() {
            this.keys = [];
            this.values = [];
        }

        PolyfillWeakMap.prototype = {
            set: function (key, value) {
                // 检查key是否已经存在
                var index = this.keys.indexOf(key);
                if (index === -1) {
                    // 如果key不存在，则添加新的key和value
                    this.keys.push(key);
                    this.values.push(value);
                } else {
                    // 如果key已经存在，则更新对应的value
                    this.values[index] = value;
                }
            },
            get: function (key) {
                // 查找key对应的value
                var index = this.keys.indexOf(key);
                return index !== -1 ? this.values[index] : undefined;
            },
            has: function (key) {
                // 检查key是否存在
                return this.keys.indexOf(key) !== -1;
            },
            delete: function (key) {
                // 删除key和对应的value
                var index = this.keys.indexOf(key);
                if (index !== -1) {
                    this.keys.splice(index, 1);
                    this.values.splice(index, 1);
                }
            }
        };

        // 将PolyfillWeakMap赋值给全局的WeakMap
        window.WeakMap = PolyfillWeakMap;
    })();
}

// 现在可以正常使用WeakMap
// var myWeakMap = new WeakMap();
// 继续使用myWeakMap...

//1index.js
let obj = {
    flag: true,
    count: 1,
    name: "zhangsan"
}
let activeEffect = null //定义当前正在收集的依赖函数 
let bucket = new WeakMap()//
const newObj = new Proxy(obj, {
    get(target, key) {
        //新收集依赖
        track(target, key)
        return Reflect.get(target, key)
    },
    set(target, key, value) {
        Reflect.set(target, key, value)
        //新触发依赖
        trigger(target, key)
        return true
    }

})
//依赖收集
function track(target, key) {
    if (!activeEffect) return
    let depMaps = bucket.get(target)
    if (!depMaps) {
        bucket.set(target, (depMaps = new Map()))
    }
    let deps = depMaps.get(key)
    if (!deps) {
        depMaps.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    activeEffect.deps.push(deps)  //最关键的就是这里，由于是同一个deps，所以是相同的内存地址，将来从activeEffect.deps里面删除fn，那么deps里面的fn也会被删除，妙

}
//触发依赖
function trigger(target, key) {
    let depMaps = bucket.get(target)
    if (!depMaps) {
        return
    }
    let effects = depMaps.get(key)
    console.log('trigger effects', depMaps, effects)
    const effectsToRun = new Set(effects);

    effectsToRun && effectsToRun.forEach(fn => {
        fn()
    });

}
//effect相关
function effect(fn) {
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        fn();
    }
    effectFn.deps = []
    effectFn();

}
function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn) //这里删除以后，bucket 的tracker函数中的deps里面的effectFn也会被清除，因为是同一个deps，同一个地址
    }
    effectFn.deps.length = 0;
}
effect(() => {
    if (newObj.flag) {
        document.getElementById("app").textContent = newObj.name
    }
})
setTimeout(() => {
    console.log('2')
    newObj.flag = false
    newObj.name = "lisi"
    console.log('bucket2', bucket)
}, 10000)
console.log('bucket1', bucket)
