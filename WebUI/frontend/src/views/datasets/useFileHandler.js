import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
export function useFileHandler() {
    const title = ref([]);
    const tableData = ref([]);
    const totalRecords = ref(0); // 总记录数
    const previewLimit = ref(50); // 默认预览前10条
    // 文件读取方法
    const readCSV = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };
    const readXLSX = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };
    const handleFileChange = async (file) => {
        try {
            // 重置数据
            title.value = [];
            tableData.value = [];
            console.log('Selected file:', file);
            const ext = file.name.split('.').pop().toLowerCase();
            let data = [];
            if (['csv', 'xlsx', 'xls'].includes(ext)) {
                const fileContent = ext === 'csv'
                    ? await readCSV(file)
                    : await readXLSX(file);
                const workbook = XLSX.read(fileContent, {
                    type: ext === 'csv' ? 'string' : 'binary'
                });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(worksheet);
            }
            else {
                ElMessage.error(`不支持的文件格式: ${ext}`);
                return;
            }
            // 处理预览数据
            const previewData = data.slice(0, previewLimit.value);
            totalRecords.value = data.length; // 更新总记录数
            if (previewData.length > 0) {
                // 提取表头
                title.value = Object.keys(previewData[0]);
                // 格式化表格数据
                tableData.value = previewData.map(item => {
                    const obj = {};
                    title.value.forEach(col => {
                        obj[col] = item[col];
                    });
                    return obj;
                });
            }
        }
        catch (error) {
            ElMessage.error('文件读取失败: ' + error.message);
        }
    };
    return {
        title,
        tableData,
        totalRecords,
        handleFileChange
    };
}
