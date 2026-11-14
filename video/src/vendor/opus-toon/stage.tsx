import {useVideoConfig} from 'remotion';
export const useStage=()=>{const {width:w,height:h,fps}=useVideoConfig();return{w,h,fps,portrait:h>w};};
