import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    direction?: 'forward' | 'back';
}

const slideDistance = 60; // px — subtle enough not to feel jarring on mid-range phones

const variants = {
    enter: (direction: 'forward' | 'back') => ({
        x: direction === 'forward' ? slideDistance : -slideDistance,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: 'forward' | 'back') => ({
        x: direction === 'forward' ? -slideDistance : slideDistance,
        opacity: 0,
    }),
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
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
            }}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
