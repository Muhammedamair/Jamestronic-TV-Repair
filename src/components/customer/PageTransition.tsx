import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    direction?: 'forward' | 'back';
}

const slideDistance = 60; // px — subtle enough not to feel jarring on mid-range phones

const variants = {
    enter: {
        opacity: 0,
    },
    center: {
        opacity: 1,
    },
    exit: {
        opacity: 0,
    },
};

const PageTransition: React.FC<PageTransitionProps> = ({ children, direction = 'forward' }) => {
    return (
        <motion.div
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                opacity: { duration: 0.15, ease: 'easeInOut' },
            }}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
