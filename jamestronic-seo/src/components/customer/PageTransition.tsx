"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    direction?: 'forward' | 'back';
}

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
                opacity: { duration: 0.12, ease: 'easeInOut' },
            }}
            style={{
                minHeight: '100dvh',
                background: '#F9FAFB',
            }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
